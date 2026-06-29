import { Calendar, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { buildIcs, downloadIcs, googleCalendarUrl, outlookCalendarUrl } from "@/lib/appointments";

export function CalendarExportMenu({
  appointmentId,
  title,
  description,
  location,
  startIso,
  durationMinutes,
}: {
  appointmentId: string;
  title: string;
  description?: string;
  location?: string;
  startIso: string;
  durationMinutes: number;
}) {
  const payload = { title, description, location, startIso, durationMinutes };
  const handleIcs = () => {
    const ics = buildIcs({ id: appointmentId, ...payload });
    downloadIcs(`rdv-healthlink-${appointmentId.slice(0, 8)}.ics`, ics);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Calendar className="h-4 w-4" /> Ajouter au calendrier</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={googleCalendarUrl(payload)} target="_blank" rel="noreferrer">Google Calendar</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={outlookCalendarUrl(payload)} target="_blank" rel="noreferrer">Outlook</a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleIcs} className="gap-2"><Download className="h-3.5 w-3.5" /> Apple / Téléchargement .ics</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}