export const copyToClipboard = async (text: string): Promise<boolean> => {
	if (!navigator.clipboard) {
		return legacyCopy(text);
	}

	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
};

const legacyCopy = (text: string): boolean => {
	const textArea = document.createElement("textarea");
	textArea.value = text;

	textArea.style.position = "fixed";
	textArea.style.left = "-9999px";
	textArea.style.top = "0";
	document.body.appendChild(textArea);

	textArea.focus();
	textArea.select();

	try {
		const successful = document.execCommand("copy");
		document.body.removeChild(textArea);
		return successful;
	} catch {
		document.body.removeChild(textArea);
		return false;
	}
};
