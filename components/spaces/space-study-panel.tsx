"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SpaceStudyPanel() {
  const [tab, setTab] = useState("lessons");

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col">
      <TabsList className="w-fit">
        <TabsTrigger value="lessons">Lessons</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
      </TabsList>
      <TabsContent value="lessons" className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Lessons will appear here.
        </div>
      </TabsContent>
      <TabsContent value="chat" className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Chat will appear here.
        </div>
      </TabsContent>
      <TabsContent value="flashcards" className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Flashcards will appear here.
        </div>
      </TabsContent>
    </Tabs>
  );
}

