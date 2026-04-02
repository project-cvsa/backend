import path from "node:path";
import { AutoTokenizer, type PreTrainedTokenizer } from "@huggingface/transformers";
import { downloadFile } from "@huggingface/hub";
import * as ort from "onnxruntime-node";

const modelDir = path.join(import.meta.dir, "../../../../model/");

// TODO: More formalized config
const tokenizerModel = "minishlab/potion-multilingual-128M";
const modelPath = path.join(modelDir, "./potion-quant/model.onnx");

// TODO: Unit test for this
export class EmbeddingManager {
	private tokenizer: PreTrainedTokenizer | null = null;
	private session: ort.InferenceSession | null = null;

	public async init(): Promise<boolean> {
		try {
			await this.downloadModel();
			await this.initTokenizer();
			await this.initSession();
			return true;
		} catch (e) {
			console.error(e);
			return false;
		}
	}

	private async initTokenizer(): Promise<void> {
		if (this.tokenizer !== null) {
			return;
		}
		this.tokenizer = await AutoTokenizer.from_pretrained(tokenizerModel);
	}

	private async initSession(): Promise<void> {
		if (this.session !== null) {
			return;
		}
		this.session = await ort.InferenceSession.create(modelPath);
	}

	private async getTokenizer(): Promise<PreTrainedTokenizer> {
		if (this.tokenizer === null) {
			this.tokenizer = await AutoTokenizer.from_pretrained(tokenizerModel);
		}
		return this.tokenizer;
	}

	private async getModelSession(): Promise<ort.InferenceSession> {
		if (this.session === null) {
			this.session = await ort.InferenceSession.create(modelPath);
		}
		return this.session;
	}

	private reshape(data: Float16Array, shape: number[]) {
		const [rows, cols] = shape;
		const result = [];

		for (let i = 0; i < rows; i++) {
			const start = i * cols;
			const end = start + cols;

			result.push(Array.from(data.subarray(start, end)));
		}

		return result;
	}

	// TODO: progress indicator
	private async downloadModel() {
		const modelFile = Bun.file(modelPath);
		if (await modelFile.exists()) {
			return;
		}
		console.log("Downloading embedding model...");
		const blob = await downloadFile({
			repo: "alikia2x/potion-multilingual-128M-int8",
			path: "onnx/model.onnx",
		});
		if (!blob) {
			throw new Error("Cannot download model file.");
		}
		const buffer = await blob.arrayBuffer();
		console.log("Embedding model downloaded.");
		modelFile.write(buffer);
	}

	public async getEmbedding(texts: string[]): Promise<number[][]> {
		const tokenizer = await this.getTokenizer();
		const session = await this.getModelSession();

		const { input_ids } = await tokenizer(texts, {
			add_special_tokens: false,
			return_tensor: false,
		});

		const cumsum = (arr: number[]): number[] => {
			const result: number[] = new Array(arr.length);
			let currentSum = 0;
			for (let i = 0; i < arr.length; i++) {
				currentSum += arr[i];
				result[i] = currentSum;
			}
			return result;
		};

		const offsets: number[] = [
			0,
			...cumsum(input_ids.slice(0, -1).map((x: string) => x.length)),
		];
		const flattened_input_ids = input_ids.flat();

		const inputs = {
			input_ids: new ort.Tensor("int64", new BigInt64Array(flattened_input_ids.map(BigInt)), [
				flattened_input_ids.length,
			]),
			offsets: new ort.Tensor("int64", new BigInt64Array(offsets.map(BigInt)), [
				offsets.length,
			]),
		};

		const { embeddings } = await session.run(inputs);
		return this.reshape(embeddings.data as unknown as Float16Array, [...embeddings.dims]);
	}
}

const manager = new EmbeddingManager();
const success = await manager.init();
export const embeddingManager = success ? manager : undefined;
