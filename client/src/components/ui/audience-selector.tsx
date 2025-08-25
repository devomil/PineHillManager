import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Users, User, Building, Search, Check, X, UserCheck } from "lucide-react";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  primaryStore?: string;
  assignedStores?: string[];
  isActive: boolean;
}

interface AudienceSelectorProps {
  selectedAudience: string[];
  onAudienceChange: (audience: string[]) => void;
  name?: string;
  showSMSInfo?: boolean;
}

export function AudienceSelector({ 
  selectedAudience, 
  onAudienceChange, 
  name = "targetAudience",
  showSMSInfo = false 
}: AudienceSelectorProps) {
  const [activeTab, setActiveTab] = useState("groups");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);

  // Fetch all employees for individual selection
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const response = await fetch("/api/employees", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch employees");
      return response.json();
    }
  });

  // Predefined audience groups
  const audienceGroups = [
    {
      id: "all",
      name: "All Employees",
      description: "Send to everyone in the company",
      icon: <Users className="h-4 w-4" />,
      count: employees.filter(e => e.isActive).length
    },
    {
      id: "employees-only",
      name: "Employees Only",
      description: "Send to employees (excludes managers and admins)",
      icon: <User className="h-4 w-4" />,
      count: employees.filter(e => e.isActive && e.role === "employee").length
    },
    {
      id: "admins-managers",
      name: "Admins & Managers",
      description: "Send to management team only",
      icon: <UserCheck className="h-4 w-4" />,
      count: employees.filter(e => e.isActive && (e.role === "admin" || e.role === "manager")).length
    },
    {
      id: "managers-only", 
      name: "Managers Only",
      description: "Send to managers only",
      icon: <UserCheck className="h-4 w-4" />,
      count: employees.filter(e => e.isActive && e.role === "manager").length
    },
    {
      id: "admins-only",
      name: "Admins Only", 
      description: "Send to administrators only",
      icon: <UserCheck className="h-4 w-4" />,
      count: employees.filter(e => e.isActive && e.role === "admin").length
    }
  ];

  // Location-based groups
  const locationGroups = [
    {
      id: "lake-geneva",
      name: "Lake Geneva Team",
      description: "All employees at Lake Geneva location",
      icon: <Building className="h-4 w-4" />,
      count: employees.filter(e => e.isActive && (e.primaryStore === "lake_geneva" || e.assignedStores?.includes("lake_geneva"))).length
    },
    {
      id: "watertown", 
      name: "Watertown Team",
      description: "All employees at Watertown locations",
      icon: <Building className="h-4 w-4" />,
      count: employees.filter(e => e.isActive && (e.primaryStore === "watertown" || e.assignedStores?.includes("watertown"))).length
    },
    {
      id: "watertown-retail",
      name: "Watertown Retail",
      description: "Watertown retail location team",
      icon: <Building className="h-4 w-4" />,
      count: employees.filter(e => e.isActive && (e.primaryStore === "watertown_retail" || e.assignedStores?.includes("watertown_retail"))).length
    },
    {
      id: "watertown-spa",
      name: "Watertown Spa",
      description: "Watertown spa team",
      icon: <Building className="h-4 w-4" />,
      count: employees.filter(e => e.isActive && (e.primaryStore === "watertown_spa" || e.assignedStores?.includes("watertown_spa"))).length
    },
    {
      id: "online-team",
      name: "Online Team", 
      description: "Online/remote employees",
      icon: <Building className="h-4 w-4" />,
      count: employees.filter(e => e.isActive && (e.primaryStore === "online" || e.assignedStores?.includes("online"))).length
    }
  ];

  // Filter employees for individual selection
  const filteredEmployees = employees.filter(employee => {
    if (!employee.isActive) return false;
    if (!searchTerm) return true;
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    const email = employee.email.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower) || 
           employee.department?.toLowerCase().includes(searchLower) ||
           employee.position?.toLowerCase().includes(searchLower);
  });

  // Handle group selection
  const handleGroupSelect = (groupId: string) => {
    onAudienceChange([groupId]);
    setSelectedIndividuals([]);
  };

  // Handle individual employee selection
  const handleIndividualToggle = (employeeId: string) => {
    const newSelected = selectedIndividuals.includes(employeeId)
      ? selectedIndividuals.filter(id => id !== employeeId)
      : [...selectedIndividuals, employeeId];
    
    setSelectedIndividuals(newSelected);
    onAudienceChange(newSelected.map(id => `user:${id}`));
  };

  // Handle select all/none for individuals
  const handleSelectAll = () => {
    const allIds = filteredEmployees.map(e => e.id);
    setSelectedIndividuals(allIds);
    onAudienceChange(allIds.map(id => `user:${id}`));
  };

  const handleSelectNone = () => {
    setSelectedIndividuals([]);
    onAudienceChange([]);
  };

  // Get current selection summary
  const getSelectionSummary = () => {
    if (selectedAudience.length === 0) return "No recipients selected";
    
    if (selectedAudience.length === 1 && !selectedAudience[0].startsWith("user:")) {
      const group = [...audienceGroups, ...locationGroups].find(g => g.id === selectedAudience[0]);
      return group ? `${group.name} (${group.count} people)` : selectedAudience[0];
    }
    
    if (selectedAudience.every(a => a.startsWith("user:"))) {
      const count = selectedAudience.length;
      return count === 1 ? "1 individual selected" : `${count} individuals selected`;
    }
    
    return `${selectedAudience.length} recipients selected`;
  };

  // Calculate total SMS recipients if showSMSInfo is true
  const getSMSCount = () => {
    if (!showSMSInfo) return 0;
    
    if (selectedAudience.length === 1 && selectedAudience[0] === "all") {
      return employees.filter(e => e.isActive).length;
    }
    
    if (selectedAudience.every(a => a.startsWith("user:"))) {
      return selectedAudience.length;
    }
    
    // Calculate based on group selection
    return 0; // Simplified for now
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Target Audience
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Choose who will receive this announcement
          </p>
          <Badge variant="outline" className="text-xs">
            {getSelectionSummary()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="individuals">Individuals</TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="space-y-4 mt-4">
            <div className="space-y-2">
              {audienceGroups.map(group => (
                <div
                  key={group.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedAudience.includes(group.id) ? "bg-primary/10 border-primary" : "border-border"
                  }`}
                  onClick={() => handleGroupSelect(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${selectedAudience.includes(group.id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {group.icon}
                      </div>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{group.count}</Badge>
                      {selectedAudience.includes(group.id) && (
                        <Check className="h-4 w-4 text-primary mt-1 ml-2" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4 mt-4">
            <div className="space-y-2">
              {locationGroups.map(group => (
                <div
                  key={group.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedAudience.includes(group.id) ? "bg-primary/10 border-primary" : "border-border"
                  }`}
                  onClick={() => handleGroupSelect(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${selectedAudience.includes(group.id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {group.icon}
                      </div>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{group.count}</Badge>
                      {selectedAudience.includes(group.id) && (
                        <Check className="h-4 w-4 text-primary mt-1 ml-2" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="individuals" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={filteredEmployees.length === 0}
                >
                  Select All
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectNone}
                  disabled={selectedIndividuals.length === 0}
                >
                  Clear
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ScrollArea className="h-64 w-full border rounded-md">
                  <div className="p-4 space-y-2">
                    {filteredEmployees.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        {searchTerm ? "No employees found matching your search" : "No employees available"}
                      </p>
                    ) : (
                      filteredEmployees.map(employee => (
                        <div
                          key={employee.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedIndividuals.includes(employee.id)}
                            onCheckedChange={() => handleIndividualToggle(employee.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {employee.role}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {employee.email}
                              {employee.department && ` • ${employee.department}`}
                              {employee.position && ` • ${employee.position}`}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
              
              {selectedIndividuals.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedIndividuals.length} employee{selectedIndividuals.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {showSMSInfo && getSMSCount() > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              📱 This will send SMS notifications to {getSMSCount()} recipients
            </p>
          </div>
        )}

        {/* Hidden inputs for form submission */}
        {selectedAudience.map((audience, index) => (
          <input
            key={index}
            type="hidden"
            name={`${name}[${index}]`}
            value={audience}
          />
        ))}
      </CardContent>
    </Card>
  );
}