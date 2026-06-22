import { IconPlus, IconPencil, IconPencilOff, IconSettings, IconRefresh, IconQuestionMark } from '@tabler/icons-react'

interface SidebarProps {
  editMode:        boolean
  refreshing:      boolean
  onToggleEdit:    () => void
  onAddClick:      () => void
  onSettingsClick: () => void
  onRefreshClick:  () => void
  onHelpClick:     () => void
}

export default function Sidebar({ editMode, refreshing, onToggleEdit, onAddClick, onSettingsClick, onRefreshClick, onHelpClick }: SidebarProps) {
  const btn = (onClick: () => void, active: boolean, children: React.ReactNode, title: string, label: string) => (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-full rounded-md border-0 cursor-pointer flex flex-col items-center justify-center gap-[3px] py-[7px] transition-[background,color] duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white-20 ${
        active
          ? 'bg-[rgba(99,102,241,0.18)] text-[rgba(129,140,248,0.95)]'
          : 'bg-transparent text-white-35 hover:text-white-60 hover:bg-white-5'
      }`}
    >
      {children}
      <span className="text-[9px] tracking-[0.04em] leading-none">{label}</span>
    </button>
  )

  return (
    <aside className="w-[60px] bg-bg-surface border-r border-white-8 flex flex-col items-center pt-3 pb-3 gap-1 px-2">
      {btn(onAddClick, false, <IconPlus size={17} stroke={1.5} />, 'Add service', 'Add')}
      {btn(onToggleEdit, editMode, editMode
        ? <IconPencilOff size={17} stroke={1.5} />
        : <IconPencil    size={17} stroke={1.5} />,
        editMode ? 'Done editing' : 'Edit services',
        editMode ? 'Done' : 'Edit'
      )}
      {btn(onRefreshClick, false,
        <IconRefresh size={17} stroke={1.5} className={refreshing ? 'animate-spin' : ''} />,
        'Refresh now',
        'Refresh'
      )}
      <div className="flex-1" />
      {btn(onHelpClick,     false, <IconQuestionMark size={17} stroke={1.5} />, 'Help', 'Help')}
      {btn(onSettingsClick, false, <IconSettings size={17} stroke={1.5} />, 'Settings', 'Settings')}
    </aside>
  )
}
