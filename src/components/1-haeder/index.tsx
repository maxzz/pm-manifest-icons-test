import * as React from "react";

export function Header() {
    return (
        <header className="flex items-center justify-between w-full h-16 bg-background-light">
            <div className="flex items-center gap-2 px-4">
                <img src="/logo.png" className="h-8 w-auto" alt="logo" />
                <span className="text-xl font-bold">PM Manifest Icons</span>
            </div>
        </header>
    );
}