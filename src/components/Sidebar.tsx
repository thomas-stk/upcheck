import { IconPlus, IconPencil, IconPencilOff } from '@tabler/icons-react'

interface SidebarProps {
  editMode:      boolean
  onToggleEdit:  () => void
  onAddClick:    () => void
}

export default function Sidebar({ editMode, onToggleEdit, onAddClick }: SidebarProps) {
  const btn = (onClick: () => void, active: boolean, children: React.ReactNode, title: string) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-md border-0 cursor-pointer flex items-center justify-center transition-[background,color] duration-150 ${active ? 'bg-[rgba(99,102,241,0.15)] text-[rgba(129,140,248,0.9)]' : 'bg-transparent text-white-25'}`}
    >
      {children}
    </button>
  )

  return (
    <aside className="w-11 bg-bg-surface border-r border-white-5 flex flex-col items-center pt-3 gap-1.5">
      {btn(onAddClick,    false,    <IconPlus      size={15} stroke={1.5} />, 'Add service')}
      {btn(onToggleEdit, editMode, editMode
        ? <IconPencilOff size={15} stroke={1.5} />
        : <IconPencil    size={15} stroke={1.5} />, editMode ? 'Done editing' : 'Remove services')}
    </aside>
  )
}
