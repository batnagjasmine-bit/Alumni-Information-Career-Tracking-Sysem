"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  published_at: string;
}

export function AnnouncementPopup() {
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    async function fetchLatestAnnouncement() {
      try {
        const res = await fetch("/api/alumni/announcements?page=1");
        if (!res.ok) return;
        const { data } = await res.json();
        
        if (data && data.length > 0) {
          const latest = data[0];
          
          // Check if user has already seen this specific announcement
          const seenId = localStorage.getItem("latest_seen_announcement");
          if (seenId !== latest.id) {
            setAnnouncement(latest);
            setOpen(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch announcements for popup", error);
      }
    }

    fetchLatestAnnouncement();
  }, []);

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem("latest_seen_announcement", announcement.id);
    }
    setOpen(false);
  };

  if (!announcement) return null;

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Megaphone className="text-primary h-5 w-5" />
            {announcement.title}
          </DialogTitle>
          <DialogDescription>
            Posted on {format(new Date(announcement.published_at), "MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 text-sm text-foreground/80 leading-relaxed max-h-[60vh] overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: announcement.content }} />
        
        <DialogFooter className="mt-6">
          <Button onClick={handleDismiss} className="w-full sm:w-auto">
            Got it, thanks!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
