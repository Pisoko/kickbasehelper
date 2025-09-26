"use client"

import { useState } from "react"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BundesligaLogo } from "./BundesligaLogo"

const BUNDESLIGA_TEAMS = [
  "FC Bayern München",
  "Borussia Dortmund",
  "RB Leipzig",
  "Bayer 04 Leverkusen",
  "VfL Wolfsburg",
  "Eintracht Frankfurt",
  "Borussia Mönchengladbach",
  "1. FC Union Berlin",
  "SC Freiburg",
  "VfB Stuttgart",
  "1. FSV Mainz 05",
  "TSG 1899 Hoffenheim",
  "FC Augsburg",
  "1. FC Köln",
  "Hertha BSC",
  "Werder Bremen",
  "FC Schalke 04",
  "Arminia Bielefeld"
]

interface TeamSelectorProps {
  onTeamChange?: (team: string) => void
  defaultTeam?: string
  label?: string
}

export function TeamSelector({ 
  onTeamChange, 
  defaultTeam = BUNDESLIGA_TEAMS[0],
  label = "Team auswählen"
}: TeamSelectorProps) {
  const [selectedTeam, setSelectedTeam] = useState(defaultTeam)

  const handleValueChange = (value: string) => {
    setSelectedTeam(value)
    if (onTeamChange) {
      onTeamChange(value)
    }
  }

  return (
    <div className="w-full max-w-xs">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label}
      </label>
      <Select value={selectedTeam} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <BundesligaLogo teamName={selectedTeam} size="xs" />
            <SelectValue placeholder="Team auswählen" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {BUNDESLIGA_TEAMS.map((team) => (
            <SelectItem key={team} value={team} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <BundesligaLogo teamName={team} size="xs" />
                <span>{team}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}