import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { login } from '@/routes';

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="devnotes" />

            <div className="min-h-screen bg-zinc-950 text-zinc-100">
                <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 lg:px-10">
                    <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-6">
                        <Link href="/" className="flex items-center gap-3">
                            <img
                                alt="devnotes"
                                className="h-10 w-auto"
                                src="/branding/logo-wide.png"
                            />
                        </Link>

                        <nav className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href="/overview"
                                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
                                >
                                    Open overview
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="rounded-md px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
                                    >
                                        Log in
                                    </Link>
                                </>
                            )}
                        </nav>
                    </header>

                    <main className="flex flex-1 items-center py-16 lg:py-24">
                        <div className="grid w-full gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                            <section className="space-y-8">
                                <div className="space-y-4">
                                    <p className="text-sm font-medium tracking-[0.22em] text-zinc-400 uppercase">
                                        Personal work, tracked clearly
                                    </p>
                                    <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                                        A focused workspace for clients,
                                        projects, issues, boards, and notes.
                                    </h1>
                                    <p className="max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                                        devnotes keeps operational work close to
                                        the conversations and decisions around
                                        it. Start simple, stay organized, and
                                        use the built-in assistant when it
                                        helps.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    {auth.user ? (
                                        <Link
                                            href="/overview"
                                            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
                                        >
                                            Go to overview
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                href={login()}
                                                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200"
                                            >
                                                Log in
                                                <ArrowRight className="size-4" />
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </section>

                            <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:grid-cols-3 lg:grid-cols-1">
                                <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                                    <p className="text-sm font-medium text-white">
                                        Track work cleanly
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                                        Clients, projects, boards, issues, and
                                        discussion in one place.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                                    <p className="text-sm font-medium text-white">
                                        Keep context close
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                                        Comments, replies, and board state stay
                                        near the work instead of scattered
                                        around.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/8 bg-black/20 p-5">
                                    <p className="text-sm font-medium text-white">
                                        Use the assistant when useful
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                                        Read context directly, confirm
                                        mutations, and keep control over
                                        sensitive actions.
                                    </p>
                                </div>
                            </section>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
