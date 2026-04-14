export default function AppLogo() {
    return (
        <>
            <img
                alt="devnotes"
                className="h-8 w-8 object-contain"
                src="/branding/my-logo.svg"
            />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    devnotes
                </span>
            </div>
        </>
    );
}
