"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/Badge";

export interface SocialPlatform {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

interface SocialPlatformCardProps {
  platform: SocialPlatform;
  isConnected: boolean;
  leadsCount: number;
  onOpenModal: () => void;
  onDisconnect: () => void;
  isDisconnecting?: boolean;
}

export function SocialPlatformCard({
  platform,
  isConnected,
  leadsCount,
  onOpenModal,
  onDisconnect,
  isDisconnecting,
}: SocialPlatformCardProps) {
  return (
    <Card className="group relative overflow-hidden bg-white border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl flex flex-col h-full">
      <CardContent className="p-0 flex flex-col flex-1">
        <div className={`h-1.5 w-full ${platform.color} opacity-90`} />
        <div className="p-5 flex flex-col flex-1 justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${platform.color} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}>
                {platform.icon}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-medium text-[11px]">
                  {platform.category}
                </Badge>
                <AnimatePresence mode="wait">
                  {isConnected ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-none flex items-center gap-1 px-2.5 py-0.5 font-semibold text-xs">
                      <FaCheckCircle className="size-3 text-emerald-600" />
                      Connected
                      {leadsCount > 0 && (
                        <span className="ml-1 text-[11px] bg-emerald-200/80 px-1.5 py-0.2 rounded-full font-bold">
                          {leadsCount}
                        </span>
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-200 font-normal text-xs">
                      Not Connected
                    </Badge>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {platform.name}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed min-h-[48px]">
                {platform.description}
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3 mt-auto">
            {isConnected ? (
              <>
                <Button
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-all duration-300 text-xs font-semibold"
                  onClick={onOpenModal}
                >
                  Manage Settings
                </Button>
                <Button
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs"
                  onClick={onDisconnect}
                  disabled={isDisconnecting}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all text-xs font-semibold"
                onClick={onOpenModal}
              >
                Connect Channel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
