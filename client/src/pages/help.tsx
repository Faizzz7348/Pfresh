import { useState, useEffect } from "react";
import { Bot, ArrowLeft, Sun, Moon, Sparkles, MessageCircle, Zap, Shield, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpChatbot } from "@/components/help-chatbot";
import { useTheme } from "next-themes";

export default function HelpPage() {
  const [, setLocation] = useLocation();
  const [showChatbot, setShowChatbot] = useState(true); // Changed to true to auto-open
  const { theme } = useTheme();

  // No need for timer, chatbot opens immediately
  // Auto-redirect back to home when chatbot is closed
  useEffect(() => {
    if (!showChatbot) {
      setLocation('/');
    }
  }, [showChatbot, setLocation]);

  const features = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Natural Conversations",
      description: "Ask questions in your own words - the AI understands context and intent"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Multi-Language Support",
      description: "Switch between English, Bahasa Melayu, Tamil, and Chinese seamlessly"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Instant Responses",
      description: "Get immediate answers with detailed explanations and step-by-step guides"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Always Available",
      description: "24/7 assistance for all your questions about the route management system"
    }
  ];

  return (
    <>
      {/* Chatbot Modal - Opens immediately and redirects to home when closed */}
      <HelpChatbot open={showChatbot} onOpenChange={setShowChatbot} />
    </>
  );
}
