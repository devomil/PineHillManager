import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, Users, Calendar, Clock, MessageCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HelpCharacter {
  id: string;
  name: string;
  role: string;
  avatar: string;
  personality: string;
  expertise: string[];
}

interface HelpTip {
  id: string;
  characterId: string;
  title: string;
  content: string;
  context: string[];
  icon: React.ReactNode;
  priority: "high" | "medium" | "low";
}

const helpCharacters: HelpCharacter[] = [
  {
    id: "sage",
    name: "Sage",
    role: "System Guide",
    avatar: "🧙‍♂️",
    personality: "wise and patient",
    expertise: ["navigation", "general_help", "getting_started"]
  },
  {
    id: "alex",
    name: "Alex",
    role: "Time Management Expert",
    avatar: "⏰",
    personality: "organized and efficient",
    expertise: ["scheduling", "time_tracking", "calendar"]
  },
  {
    id: "maya",
    name: "Maya",
    role: "Communication Specialist",
    avatar: "💬",
    personality: "friendly and social",
    expertise: ["messaging", "announcements", "team_communication"]
  },
  {
    id: "coach",
    name: "Coach",
    role: "Manager Assistant",
    avatar: "👔",
    personality: "professional and strategic",
    expertise: ["management", "reports", "employee_oversight"]
  }
];

const contextualTips: HelpTip[] = [
  {
    id: "welcome_tip",
    characterId: "sage",
    title: "Welcome to Pine Hill Farm!",
    content: "Hi there! I'm Sage, your helpful guide. Click on any character like me to get personalized tips and assistance throughout the portal.",
    context: ["dashboard", "first_visit"],
    icon: <Lightbulb className="w-4 h-4" />,
    priority: "high"
  },
  {
    id: "dashboard_overview",
    characterId: "sage",
    title: "Dashboard Overview",
    content: "Your dashboard shows upcoming shifts, recent announcements, and quick actions. Use the sidebar to navigate to different sections.",
    context: ["dashboard"],
    icon: <Settings className="w-4 h-4" />,
    priority: "medium"
  },
  {
    id: "time_tracking_tip",
    characterId: "alex",
    title: "Track Your Time Efficiently",
    content: "Click 'Clock In/Out' to start tracking your shift. You can also view your timesheet history and submit corrections if needed.",
    context: ["time-management", "calendar"],
    icon: <Clock className="w-4 h-4" />,
    priority: "medium"
  },
  {
    id: "time_off_requests",
    characterId: "alex",
    title: "Request Time Off",
    content: "Need time off? Submit requests here and track their approval status. Plan ahead for better approval chances!",
    context: ["time-management"],
    icon: <Calendar className="w-4 h-4" />,
    priority: "high"
  },
  {
    id: "messaging_tip",
    characterId: "maya",
    title: "Stay Connected",
    content: "Use our messaging system to chat with colleagues, create group discussions, and receive important notifications.",
    context: ["communication"],
    icon: <MessageCircle className="w-4 h-4" />,
    priority: "medium"
  },
  {
    id: "announcements_tip",
    characterId: "maya",
    title: "Important Announcements",
    content: "Check here for company updates, policy changes, and important notices. New announcements are highlighted!",
    context: ["announcements"],
    icon: <MessageCircle className="w-4 h-4" />,
    priority: "high"
  },
  {
    id: "schedule_management",
    characterId: "alex",
    title: "Manage Your Schedule",
    content: "View your upcoming shifts, request shift swaps, and check coverage requests from teammates.",
    context: ["shift-scheduling", "calendar"],
    icon: <Calendar className="w-4 h-4" />,
    priority: "high"
  },
  {
    id: "employee_directory",
    characterId: "maya",
    title: "Team Directory",
    content: "Find contact information for your colleagues, see who's working today, and check department assignments.",
    context: ["employees"],
    icon: <Users className="w-4 h-4" />,
    priority: "medium"
  },
  {
    id: "management_oversight",
    characterId: "coach",
    title: "Manager Dashboard",
    content: "As a manager, you can approve time-off requests, oversee team schedules, and access performance reports.",
    context: ["dashboard", "management"],
    icon: <Users className="w-4 h-4" />,
    priority: "high"
  },
  {
    id: "reports_access",
    characterId: "coach",
    title: "Generate Reports",
    content: "Access detailed reports on attendance, productivity, and team metrics. Export data for further analysis.",
    context: ["reports", "management"],
    icon: <Settings className="w-4 h-4" />,
    priority: "medium"
  },
  {
    id: "notification_center",
    characterId: "sage",
    title: "Stay Informed",
    content: "Check your notifications for approval updates, schedule changes, and messages from colleagues.",
    context: ["notifications"],
    icon: <Lightbulb className="w-4 h-4" />,
    priority: "medium"
  }
];

interface ContextualHelpProps {
  currentPage?: string;
  userRole?: string;
  isFirstVisit?: boolean;
}

export function ContextualHelp({ currentPage = "dashboard", userRole = "employee", isFirstVisit = false }: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<HelpCharacter | null>(null);
  const [currentTip, setCurrentTip] = useState<HelpTip | null>(null);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  // Show welcome tip for first-time visitors
  useEffect(() => {
    if (isFirstVisit && !hasSeenWelcome) {
      const welcomeTip = contextualTips.find(tip => tip.id === "welcome_tip");
      if (welcomeTip) {
        setCurrentTip(welcomeTip);
        setSelectedCharacter(helpCharacters.find(char => char.id === welcomeTip.characterId) || null);
        setIsOpen(true);
        setHasSeenWelcome(true);
      }
    }
  }, [isFirstVisit, hasSeenWelcome]);

  // Get relevant tips based on current context
  const getRelevantTips = () => {
    return contextualTips.filter(tip => {
      const contextMatch = tip.context.includes(currentPage) || tip.context.includes("general");
      const roleMatch = userRole === "admin" || userRole === "manager" ? true : !tip.context.includes("management");
      return contextMatch && roleMatch;
    }).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const handleCharacterClick = (character: HelpCharacter) => {
    setSelectedCharacter(character);
    const characterTips = getRelevantTips().filter(tip => tip.characterId === character.id);
    if (characterTips.length > 0) {
      setCurrentTip(characterTips[0]);
    }
    setIsOpen(true);
  };

  const handleCloseTip = () => {
    setIsOpen(false);
    setTimeout(() => {
      setCurrentTip(null);
      setSelectedCharacter(null);
    }, 300);
  };

  // Floating characters that appear based on context
  const getActiveCharacters = () => {
    const relevantTips = getRelevantTips();
    const activeCharacterIds = Array.from(new Set(relevantTips.map(tip => tip.characterId)));
    return helpCharacters.filter(char => activeCharacterIds.includes(char.id));
  };

  return (
    <>
      {/* Floating Help Characters */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {getActiveCharacters().map((character, index) => (
          <motion.div
            key={character.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCharacterClick(character)}
              className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-green-200 hover:border-green-400"
              title={`${character.name} - ${character.role}`}
            >
              <span className="text-xl">{character.avatar}</span>
            </Button>
            
            {/* Character has tip indicator */}
            {getRelevantTips().some(tip => tip.characterId === character.id) && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Help Tooltip Modal */}
      <AnimatePresence>
        {isOpen && currentTip && selectedCharacter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseTip}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full"
            >
              <Card className="border-green-200 dark:border-green-700 shadow-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xl">
                        {selectedCharacter.avatar}
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {currentTip.icon}
                          {currentTip.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedCharacter.name} • {selectedCharacter.role}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCloseTip}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {currentTip.content}
                  </p>
                  
                  {/* Show other tips from this character */}
                  {getRelevantTips().filter(tip => tip.characterId === selectedCharacter.id && tip.id !== currentTip.id).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                        More tips from {selectedCharacter.name}:
                      </p>
                      <div className="space-y-2">
                        {getRelevantTips()
                          .filter(tip => tip.characterId === selectedCharacter.id && tip.id !== currentTip.id)
                          .slice(0, 2)
                          .map(tip => (
                            <button
                              key={tip.id}
                              onClick={() => setCurrentTip(tip)}
                              className="w-full text-left p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {tip.icon}
                                <span className="text-sm">{tip.title}</span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook for easy integration
export function useContextualHelp(page: string, userRole?: string) {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem(`pine-hill-visited-${page}`);
    if (!hasVisited) {
      setIsFirstVisit(true);
      localStorage.setItem(`pine-hill-visited-${page}`, "true");
    }
  }, [page]);

  return { isFirstVisit };
}