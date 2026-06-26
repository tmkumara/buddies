"use client";

import { useRouter } from "next/navigation";

interface FilterTabBarProps {
  tabs: string[];
  activeTab: string;
  currentParams: Record<string, string>;
  paramName?: string;
}

export default function FilterTabBar({
  tabs,
  activeTab,
  currentParams,
  paramName = "status",
}: FilterTabBarProps) {
  const router = useRouter();

  function handleClick(tab: string) {
    const params = new URLSearchParams(currentParams);
    if (tab === "ALL") {
      params.delete(paramName);
    } else {
      params.set(paramName, tab);
    }
    params.delete("page"); // reset to page 1 on filter change
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="filter-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`filter-tab${activeTab === tab ? " active" : ""}`}
          onClick={() => handleClick(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
