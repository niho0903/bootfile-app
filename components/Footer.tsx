export function Footer() {
  return (
    <footer className="border-t border-[#dcd9d5] py-8 mt-16">
      <div className="max-w-[960px] mx-auto px-5 text-center">
        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} BootFile. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
