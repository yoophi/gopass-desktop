import { useMemo } from "react";
import { hotkeysCoreFeature, selectionFeature, syncDataLoaderFeature } from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { LuChevronDown, LuChevronRight, LuFolder, LuFolderOpen } from "react-icons/lu";

interface Node {
  name: string;
  path: string;
  children: string[];
}

// Entries live in the list beside the tree, so only folders become nodes.
function indexFolders(paths: readonly string[]) {
  const root: Node = { name: "", path: "", children: [] };
  const nodes = new Map([["root", root]]);
  for (const path of paths) {
    let parent = root;
    for (const name of path.split("/").slice(0, -1)) {
      const prefix = parent.path ? parent.path + "/" + name : name;
      const id = "folder:" + prefix;
      if (!nodes.has(id)) {
        nodes.set(id, { name, path: prefix, children: [] });
        parent.children.push(id);
      }
      parent = nodes.get(id)!;
    }
  }
  return nodes;
}

export function EntryTree({ paths, open, current }: {
  paths: readonly string[]; open: (folder: string) => void; current?: string;
}) {
  const nodes = useMemo(() => indexFolders(paths), [paths]);
  const tree = useTree<Node>({
    rootItemId: "root",
    getItemName: item => item.getItemData().name,
    isItemFolder: item => item.getItemData().children.length > 0,
    onPrimaryAction: item => open(item.getItemData().path),
    dataLoader: { getItem: id => nodes.get(id)!, getChildren: id => nodes.get(id)!.children },
    features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
  });
  return <div {...tree.getContainerProps("저장소 폴더")} className="grid gap-0.5">
    {tree.getItems().map(item=><button {...item.getProps()} key={item.getId()}
      aria-current={item.getItemData().path === current || undefined}
      className="flex items-center gap-2 rounded-lg py-1.5 pr-2 text-left hover:bg-white/10 focus-visible:outline-2 aria-[current]:bg-black/40 aria-[current]:font-semibold"
      style={{paddingLeft: 36 + item.getItemMeta().level * 16}}>
      <span aria-hidden="true" className="w-4 shrink-0">{item.isFolder() && (item.isExpanded() ? <LuChevronDown /> : <LuChevronRight />)}</span>
      {item.isExpanded() ? <LuFolderOpen aria-hidden className="shrink-0" /> : <LuFolder aria-hidden className="shrink-0" />}
      <span className="truncate">{item.getItemName()}</span>
    </button>)}
  </div>;
}
