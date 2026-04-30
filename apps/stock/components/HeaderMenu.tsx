"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Menu } from "lucide-react";

interface HeaderMenuProps {
	isAuthenticated: boolean;
	onLoginClick: () => void;
	onLogout: () => void;
}

export function HeaderMenu({
	isAuthenticated,
	onLoginClick,
	onLogout,
}: HeaderMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon-lg"
				>
					<Menu className="size-5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{isAuthenticated ? (
					<DropdownMenuItem onClick={onLogout}>
						<LogOut className="size-4" />
						退出登录
					</DropdownMenuItem>
				) : (
					<DropdownMenuItem onClick={onLoginClick}>
						<LogIn className="size-4" />
						登录
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
