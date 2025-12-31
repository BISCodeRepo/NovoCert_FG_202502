interface MenuItem {
  id: string;
  label: string;
  icon: string;
  subItems?: { id: string; label: string }[];
}

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string, uuid: string) => void;
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "",
  },
  {
    id: "prepare",
    label: "Prepare",
    icon: "",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    icon: "",
    subItems: [
      { id: "step1", label: "Step 1" },
      { id: "step2", label: "Step 2" },
      { id: "step3", label: "Step 3" },
      { id: "step4", label: "Step 4" },
      { id: "step5", label: "Step 5" },
    ],
  },
];

function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const handleMenuClick = (sectionId: string) => {
    // pipeline 클릭 시 step1로 네비게이션
    if (sectionId === "pipeline") {
      onNavigate("step1", "");
    } else {
      // 하위 메뉴가 없으면 네비게이션
      const item = menuItems.find((i) => i.id === sectionId);
      if (!item?.subItems) {
        onNavigate(sectionId, "");
      }
    }
  };

  return (
    <aside className="bg-gray-900 text-white w-64 fixed left-0 top-16 bottom-0 overflow-y-auto">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  currentPage === item.id || (item.id === "pipeline" && currentPage.startsWith("step"))
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </div>
              </button>
              {item.subItems && (
                <ul className="mt-2 ml-4 space-y-1">
                  {item.subItems.map((subItem) => (
                    <li key={subItem.id}>
                      <button
                        onClick={() => onNavigate(subItem.id, "")}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                          currentPage === subItem.id
                            ? "bg-gray-700 text-white"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                        }`}
                      >
                        {subItem.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
