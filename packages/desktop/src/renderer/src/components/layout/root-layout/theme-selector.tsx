import { Monitor, Moon, Sun } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger
} from '@/components/ui/select'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <Select defaultValue={theme} onValueChange={setTheme}>
      <SelectTrigger
        className={cn(
          'border bg-secondary font-medium text-secondary-foreground shadow-xs hover:bg-secondary/80',
          'w-fit items-center gap-2'
        )}
      >
        {theme === 'dark' ? (
          <Moon className="h-4" />
        ) : theme === 'system' ? (
          <Monitor className="h-4" />
        ) : (
          <Sun className="h-4" />
        )}
        {theme === 'dark' ? 'Dark' : theme === 'system' ? 'System' : 'Light'}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="light">Light</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
