import { useMemo } from "react";
import { hotkeysCoreFeature, selectionFeature, syncDataLoaderFeature } from "@headless-tree/core";
import { useTree } from "@headless-tree/react";

interface Node {
  name: string;
  path: string;
  folder: boolean;
  children: string[];
}

function indexPaths(paths: readonly string[]) {
  const root: Node = { name: "", path: "", folder: true, children: [] };
  const nodes = new Map([["root", root]]);
  for (const path of paths) {
    let parent = root;
    const parts = path.split("/");
    parts.forEach((name, index) => {
      const folder = index < parts.length - 1;
      const prefix = parent.path ? parent.path + "/" + name : name;
      const id = (folder ? "folder:" : "entry:") + prefix;
      if (!nodes.has(id)) {
        nodes.set(id, { name, path: prefix, folder, children: [] });
        parent.children.push(id);
      }
      parent = nodes.get(id)!;
    });
  }
  return nodes;
}

export function EntryTree({ paths, open, searching }: {
  paths: readonly string[]; open: (path: string) => void; searching: boolean;
}) {
  const nodes = useMemo(() => indexPaths(paths), [paths]);
  const tree = useTree<Node>({
    rootItemId: "root",
    initialState: { expandedItems: searching ? [...nodes.keys()].filter(id => id.startsWith("folder:")) : [] },
    getItemName: item => item.getItemData().name,
    isItemFolder: item => item.getItemData().folder,
    onPrimaryAction: item => { if (!item.isFolder()) open(item.getItemData().path); },
    dataLoader: { getItem: id => nodes.get(id)!, getChildren: id => nodes.get(id)!.children },
    features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
  });
  return <div {...tree.getContainerProps("저장소 경로")} className="grid gap-1">
    {tree.getItems().map(item=><button {...item.getProps()} key={item.getId()}
      className="rounded py-1 text-left focus-visible:outline-2" style={{paddingLeft: 12 + item.getItemMeta().level * 20}}>
      <span aria-hidden="true">{item.isFolder() ? (item.isExpanded() ? "▾ " : "▸ ") : ""}</span>{item.getItemName()}
    </button>)}
  </div>;
}
