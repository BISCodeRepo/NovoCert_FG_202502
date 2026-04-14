function Header() {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 fixed top-0 left-0 right-0 z-10">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-gray-900">NovoCert</h1>
        <span className="text-[10px] text-gray-400 leading-none">v1.1.1</span>
      </div>
    </header>
  );
}

export default Header;
