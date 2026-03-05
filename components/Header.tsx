import Link from 'next/link';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#f7f6f2]/85 backdrop-blur-md border-b border-[#dcd9d5] py-3">
      <div className="max-w-[1200px] mx-auto px-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 no-underline text-gray-900 font-heading text-xl">
          <BootFileLogoIcon />
          BootFile
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/quiz"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 px-4 py-2 rounded-md hover:bg-[#f3f0ec] transition-colors"
          >
            Take the Quiz
          </Link>
        </nav>
      </div>
    </header>
  );
}

function BootFileLogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#0e6e6e"/>
      <path d="M8 10h8M8 14h12M8 18h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
