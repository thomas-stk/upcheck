import { IconPlus, IconPencil, IconPencilOff, IconSettings } from '@tabler/icons-react'

interface SidebarProps {
  editMode:        boolean
  onToggleEdit:    () => void
  onAddClick:      () => void
  onSettingsClick: () => void
}

export default function Sidebar({ editMode, onToggleEdit, onAddClick, onSettingsClick }: SidebarProps) {
  const btn = (onClick: () => void, active: boolean, children: React.ReactNode, title: string) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-md border-0 cursor-pointer flex items-center justify-center transition-[background,color] duration-150 ${
        active
          ? 'bg-[rgba(99,102,241,0.18)] text-[rgba(129,140,248,0.95)]'
          : 'bg-transparent text-white-35 hover:text-white-60 hover:bg-white-5'
      }`}
    >
      {children}
    </button>
  )

  return (
    <aside className="w-[52px] bg-bg-surface border-r border-white-8 flex flex-col items-center pt-3 pb-3 gap-1">
      {btn(onAddClick, false, <IconPlus size={17} stroke={1.5} />, 'Add service')}
      {btn(onToggleEdit, editMode, editMode
        ? <IconPencilOff size={17} stroke={1.5} />
        : <IconPencil    size={17} stroke={1.5} />,
        editMode ? 'Done editing' : 'Remove services'
      )}
      <div className="flex-1" />
      {btn(onSettingsClick, false, <IconSettings size={17} stroke={1.5} />, 'Settings')}
    </aside>
  )
}
