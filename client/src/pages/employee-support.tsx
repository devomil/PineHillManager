import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Lightbulb, 
  Bug, 
  Rocket,
  Phone,
  Mail,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Pin,
  Eye,
  ThumbsUp,
  ThumbsDown,
  PartyPopper,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
  ArrowRight,
  Loader2,
  MapPin,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

type Article = {
  id: number;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  authorId: string;
  isPinned: boolean | null;
  isPublished: boolean | null;
  viewCount: number | null;
  helpfulCount: number | null;
  notHelpfulCount: number | null;
  publishedAt: string | null;
  createdAt: string | null;
  reactionCounts?: Record<string, number>;
  userReactions?: string[];
  userFeedback?: boolean;
};

type Ticket = {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string | null;
  status: string;
  submittedById: string;
  assignedToId: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string | null;
  submitterName?: string;
  assigneeName?: string | null;
};

const ARTICLE_CATEGORIES = [
  { value: 'whats_new', label: "What's New", icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100' },
  { value: 'helpful_tips', label: 'Helpful Tips', icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { value: 'bug_fixes', label: 'Bug Fixes', icon: Bug, color: 'text-red-600', bg: 'bg-red-100' },
  { value: 'enhancements', label: 'Enhancements', icon: Rocket, color: 'text-blue-600', bg: 'bg-blue-100' },
];

const TICKET_CATEGORIES = [
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
];

const TICKET_STATUSES = [
  { value: 'submitted', label: 'Submitted', icon: Circle, color: 'text-gray-500' },
  { value: 'in_review', label: 'In Review', icon: Eye, color: 'text-blue-500' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-orange-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-500' },
];

const REACTIONS = [
  { type: 'celebrate', emoji: '🎉', label: 'Celebrate' },
  { type: 'helpful', emoji: '👍', label: 'Helpful' },
  { type: 'lightbulb', emoji: '💡', label: 'Great idea' },
  { type: 'bug', emoji: '🐛', label: 'Found a bug' },
];

export default function EmployeeSupport() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("whats_new");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  
  // Article form state
  const [articleTitle, setArticleTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [articleExcerpt, setArticleExcerpt] = useState("");
  const [articleCategory, setArticleCategory] = useState("whats_new");
  const [articleIsPinned, setArticleIsPinned] = useState(false);
  const [articleIsPublished, setArticleIsPublished] = useState(true);
  
  // Ticket form state
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketCategory, setTicketCategory] = useState("question");
  const [ticketPriority, setTicketPriority] = useState("normal");

  // Check if user can manage articles
  const { data: canManageData } = useQuery<{ canManage: boolean }>({
    queryKey: ['/api/support/can-manage'],
  });
  const canManage = canManageData?.canManage ?? false;

  // Fetch articles
  const { data: articles = [], isLoading: articlesLoading } = useQuery<Article[]>({
    queryKey: ['/api/support/articles'],
  });

  // Fetch tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ['/api/support/tickets'],
  });

  // Create article mutation
  const createArticleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/support/articles', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/articles'] });
      toast({ title: "Article created", description: "Your article has been published." });
      resetArticleForm();
      setShowArticleModal(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create article.", variant: "destructive" });
    },
  });

  // Update article mutation
  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest('PUT', `/api/support/articles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/articles'] });
      toast({ title: "Article updated", description: "Your changes have been saved." });
      resetArticleForm();
      setShowArticleModal(false);
      setEditingArticle(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update article.", variant: "destructive" });
    },
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/support/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/articles'] });
      toast({ title: "Article deleted" });
      setSelectedArticle(null);
    },
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/support/tickets', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      toast({ title: "Ticket submitted", description: "We'll get back to you soon!" });
      resetTicketForm();
      setShowTicketModal(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit ticket.", variant: "destructive" });
    },
  });

  // Update ticket status mutation
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ id, status, resolutionNotes }: { id: number; status: string; resolutionNotes?: string }) => {
      return apiRequest('PUT', `/api/support/tickets/${id}/status`, { status, resolutionNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/tickets'] });
      toast({ title: "Ticket updated" });
    },
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ articleId, reactionType }: { articleId: number; reactionType: string }) => {
      return apiRequest('POST', `/api/support/articles/${articleId}/reactions`, { reactionType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/articles'] });
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async ({ articleId, reactionType }: { articleId: number; reactionType: string }) => {
      return apiRequest('DELETE', `/api/support/articles/${articleId}/reactions/${reactionType}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/articles'] });
    },
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ articleId, isHelpful }: { articleId: number; isHelpful: boolean }) => {
      return apiRequest('POST', `/api/support/articles/${articleId}/feedback`, { isHelpful });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/articles'] });
    },
  });

  const resetArticleForm = () => {
    setArticleTitle("");
    setArticleContent("");
    setArticleExcerpt("");
    setArticleCategory("whats_new");
    setArticleIsPinned(false);
    setArticleIsPublished(true);
    setEditingArticle(null);
  };

  const resetTicketForm = () => {
    setTicketTitle("");
    setTicketDescription("");
    setTicketCategory("question");
    setTicketPriority("normal");
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setArticleTitle(article.title);
    setArticleContent(article.content);
    setArticleExcerpt(article.excerpt || "");
    setArticleCategory(article.category);
    setArticleIsPinned(article.isPinned || false);
    setArticleIsPublished(article.isPublished !== false);
    setShowArticleModal(true);
  };

  const handleSaveArticle = () => {
    const data = {
      title: articleTitle,
      content: articleContent,
      excerpt: articleExcerpt || articleContent.substring(0, 200),
      category: articleCategory,
      isPinned: articleIsPinned,
      isPublished: articleIsPublished,
    };
    
    if (editingArticle) {
      updateArticleMutation.mutate({ id: editingArticle.id, data });
    } else {
      createArticleMutation.mutate(data);
    }
  };

  const handleReaction = (articleId: number, reactionType: string, hasReaction: boolean) => {
    if (hasReaction) {
      removeReactionMutation.mutate({ articleId, reactionType });
    } else {
      addReactionMutation.mutate({ articleId, reactionType });
    }
  };

  // Filter articles by category and search
  const filteredArticles = articles.filter(article => {
    const matchesCategory = activeTab === 'all' || article.category === activeTab;
    const matchesSearch = !searchQuery || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort articles: pinned first, then by date
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const getCategoryInfo = (category: string) => {
    return ARTICLE_CATEGORIES.find(c => c.value === category) || ARTICLE_CATEGORIES[0];
  };

  const getStatusInfo = (status: string) => {
    return TICKET_STATUSES.find(s => s.value === status) || TICKET_STATUSES[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white" 
                    style={{ fontFamily: "'Great Vibes', cursive" }}>
                  Pine Hill Farm
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Support Center</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {canManage && (
                <Button 
                  onClick={() => { resetArticleForm(); setShowArticleModal(true); }}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-create-article"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Article
                </Button>
              )}
              <Link href="/">
                <Button variant="outline" data-testid="button-back-dashboard">
                  ← Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full max-w-md"
            data-testid="input-search-articles"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 p-1 shadow-sm flex-wrap h-auto">
            {ARTICLE_CATEGORIES.map(category => {
              const Icon = category.icon;
              const count = articles.filter(a => a.category === category.value).length;
              return (
                <TabsTrigger 
                  key={category.value} 
                  value={category.value}
                  className="flex items-center gap-2 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700"
                  data-testid={`tab-${category.value}`}
                >
                  <Icon className={`h-4 w-4 ${category.color}`} />
                  <span className="hidden sm:inline">{category.label}</span>
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="contact" className="flex items-center gap-2" data-testid="tab-contact">
              <Phone className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">Contact</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2" data-testid="tab-tickets">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              <span className="hidden sm:inline">Tickets</span>
              {tickets.filter(t => t.status !== 'completed').length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {tickets.filter(t => t.status !== 'completed').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Article Category Tabs */}
          {ARTICLE_CATEGORIES.map(category => (
            <TabsContent key={category.value} value={category.value} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {articlesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : sortedArticles.length === 0 ? (
                  <Card className="py-12">
                    <CardContent className="text-center text-gray-500">
                      <category.icon className={`h-12 w-12 mx-auto mb-4 ${category.color} opacity-50`} />
                      <p className="text-lg font-medium">No articles yet</p>
                      <p className="text-sm">Check back soon for updates!</p>
                    </CardContent>
                  </Card>
                ) : (
                  sortedArticles.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ArticleCard 
                        article={article}
                        canManage={canManage}
                        onEdit={handleEditArticle}
                        onDelete={(id) => deleteArticleMutation.mutate(id)}
                        onReaction={handleReaction}
                        onFeedback={(id, isHelpful) => submitFeedbackMutation.mutate({ articleId: id, isHelpful })}
                        onSelect={setSelectedArticle}
                      />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </TabsContent>
          ))}

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-green-600" />
                    Phone Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Main Office</h4>
                    <p className="text-gray-600 dark:text-gray-400">(414) 737-4100</p>
                    <p className="text-sm text-gray-500">Monday - Friday, 8:00 AM - 5:00 PM</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">IT Support Hotline</h4>
                    <p className="text-gray-600 dark:text-gray-400">(262) 804-7976</p>
                    <p className="text-sm text-gray-500">Available 24/7 for urgent issues</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    Email Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">General Support</h4>
                    <p className="text-gray-600 dark:text-gray-400">support@pinehillfarm.co</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">HR Department</h4>
                    <p className="text-gray-600 dark:text-gray-400">hr@pinehillfarm.co</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">IT Department</h4>
                    <p className="text-gray-600 dark:text-gray-400">it@pinehillfarm.co</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-600" />
                  Office Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Lake Geneva Retail</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">123 Main Street<br />Lake Geneva, WI 53147</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Watertown Retail</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">456 Oak Avenue<br />Watertown, WI 53094</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Watertown Spa</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">789 Wellness Way<br />Watertown, WI 53094</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Support Tickets</h2>
              <Button onClick={() => setShowTicketModal(true)} data-testid="button-new-ticket">
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>

            {ticketsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : tickets.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No tickets yet</p>
                  <p className="text-sm">Submit a ticket if you need help!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <TicketCard 
                    key={ticket.id} 
                    ticket={ticket} 
                    canManage={canManage}
                    onUpdateStatus={(status, notes) => 
                      updateTicketStatusMutation.mutate({ id: ticket.id, status, resolutionNotes: notes })
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Article Modal */}
      <Dialog open={showArticleModal} onOpenChange={setShowArticleModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? 'Edit Article' : 'Create New Article'}</DialogTitle>
            <DialogDescription>
              {editingArticle ? 'Update the article details below.' : 'Create a new article for the Support Center.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={articleTitle} 
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="Article title"
                data-testid="input-article-title"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={articleCategory} onValueChange={setArticleCategory}>
                <SelectTrigger data-testid="select-article-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Excerpt (optional)</label>
              <Input 
                value={articleExcerpt} 
                onChange={(e) => setArticleExcerpt(e.target.value)}
                placeholder="Brief summary (auto-generated if left blank)"
                data-testid="input-article-excerpt"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea 
                value={articleContent} 
                onChange={(e) => setArticleContent(e.target.value)}
                placeholder="Write your article content here..."
                rows={10}
                data-testid="textarea-article-content"
              />
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="pinned" 
                  checked={articleIsPinned} 
                  onCheckedChange={(checked) => setArticleIsPinned(checked as boolean)}
                />
                <label htmlFor="pinned" className="text-sm">Pin to top</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="published" 
                  checked={articleIsPublished} 
                  onCheckedChange={(checked) => setArticleIsPublished(checked as boolean)}
                />
                <label htmlFor="published" className="text-sm">Published</label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowArticleModal(false); resetArticleForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveArticle}
              disabled={!articleTitle.trim() || !articleContent.trim() || createArticleMutation.isPending || updateArticleMutation.isPending}
              data-testid="button-save-article"
            >
              {(createArticleMutation.isPending || updateArticleMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingArticle ? 'Save Changes' : 'Create Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Modal */}
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue or request and we'll get back to you soon.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={ticketCategory} onValueChange={setTicketCategory}>
                <SelectTrigger data-testid="select-ticket-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select value={ticketPriority} onValueChange={setTicketPriority}>
                <SelectTrigger data-testid="select-ticket-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={ticketTitle} 
                onChange={(e) => setTicketTitle(e.target.value)}
                placeholder="Brief description of your issue"
                data-testid="input-ticket-title"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={ticketDescription} 
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder="Please provide detailed information..."
                rows={5}
                data-testid="textarea-ticket-description"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTicketModal(false); resetTicketForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={() => createTicketMutation.mutate({
                title: ticketTitle,
                description: ticketDescription,
                category: ticketCategory,
                priority: ticketPriority,
              })}
              disabled={!ticketTitle.trim() || !ticketDescription.trim() || createTicketMutation.isPending}
              data-testid="button-submit-ticket"
            >
              {createTicketMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Detail Modal */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {selectedArticle.isPinned && <Pin className="h-4 w-4 text-yellow-500" />}
                  <Badge className={getCategoryInfo(selectedArticle.category).bg}>
                    {getCategoryInfo(selectedArticle.category).label}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl">{selectedArticle.title}</DialogTitle>
                <DialogDescription>
                  {selectedArticle.createdAt && format(new Date(selectedArticle.createdAt), 'MMMM d, yyyy')}
                  {' · '}{selectedArticle.viewCount || 0} views
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {selectedArticle.content}
                </div>
              </div>
              
              <Separator />
              
              {/* Reactions */}
              <div className="flex items-center gap-2 pt-4">
                {REACTIONS.map(reaction => {
                  const hasReaction = selectedArticle.userReactions?.includes(reaction.type);
                  const count = selectedArticle.reactionCounts?.[reaction.type] || 0;
                  return (
                    <Button
                      key={reaction.type}
                      variant={hasReaction ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleReaction(selectedArticle.id, reaction.type, hasReaction || false)}
                      className="gap-1"
                    >
                      <span>{reaction.emoji}</span>
                      {count > 0 && <span className="text-xs">{count}</span>}
                    </Button>
                  );
                })}
              </div>
              
              {/* Helpful feedback */}
              <div className="flex items-center gap-4 pt-4">
                <span className="text-sm text-gray-500">Was this helpful?</span>
                <Button
                  variant={selectedArticle.userFeedback === true ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => submitFeedbackMutation.mutate({ articleId: selectedArticle.id, isHelpful: true })}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Yes {selectedArticle.helpfulCount ? `(${selectedArticle.helpfulCount})` : ''}
                </Button>
                <Button
                  variant={selectedArticle.userFeedback === false ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => submitFeedbackMutation.mutate({ articleId: selectedArticle.id, isHelpful: false })}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  No {selectedArticle.notHelpfulCount ? `(${selectedArticle.notHelpfulCount})` : ''}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Article Card Component
function ArticleCard({ 
  article, 
  canManage, 
  onEdit, 
  onDelete, 
  onReaction,
  onFeedback,
  onSelect 
}: { 
  article: Article;
  canManage: boolean;
  onEdit: (article: Article) => void;
  onDelete: (id: number) => void;
  onReaction: (articleId: number, reactionType: string, hasReaction: boolean) => void;
  onFeedback: (articleId: number, isHelpful: boolean) => void;
  onSelect: (article: Article) => void;
}) {
  const categoryInfo = ARTICLE_CATEGORIES.find(c => c.value === article.category) || ARTICLE_CATEGORIES[0];
  const CategoryIcon = categoryInfo.icon;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" data-testid={`card-article-${article.id}`}>
      <CardHeader className="pb-3" onClick={() => onSelect(article)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {article.isPinned && <Pin className="h-4 w-4 text-yellow-500" />}
            <Badge className={`${categoryInfo.bg} ${categoryInfo.color}`}>
              <CategoryIcon className="h-3 w-3 mr-1" />
              {categoryInfo.label}
            </Badge>
          </div>
          {canManage && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" onClick={() => onEdit(article)} data-testid={`button-edit-article-${article.id}`}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(article.id)} className="text-red-500" data-testid={`button-delete-article-${article.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <CardTitle className="text-lg mt-2">{article.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {article.excerpt || article.content.substring(0, 200)}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.viewCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {article.createdAt ? format(new Date(article.createdAt), 'MMM d') : 'Unknown'}
            </span>
          </div>
          
          {/* Quick reactions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {REACTIONS.slice(0, 2).map(reaction => {
              const hasReaction = article.userReactions?.includes(reaction.type);
              const count = article.reactionCounts?.[reaction.type] || 0;
              return (
                <Button
                  key={reaction.type}
                  variant="ghost"
                  size="sm"
                  onClick={() => onReaction(article.id, reaction.type, hasReaction || false)}
                  className={`px-2 ${hasReaction ? 'bg-slate-100' : ''}`}
                >
                  <span>{reaction.emoji}</span>
                  {count > 0 && <span className="text-xs ml-1">{count}</span>}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Ticket Card Component
function TicketCard({ 
  ticket, 
  canManage,
  onUpdateStatus 
}: { 
  ticket: Ticket;
  canManage: boolean;
  onUpdateStatus: (status: string, notes?: string) => void;
}) {
  const statusInfo = TICKET_STATUSES.find(s => s.value === ticket.status) || TICKET_STATUSES[0];
  const StatusIcon = statusInfo.icon;
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };

  return (
    <Card data-testid={`card-ticket-${ticket.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {ticket.ticketNumber}
              </Badge>
              <Badge className={priorityColors[ticket.priority || 'normal']}>
                {ticket.priority || 'normal'}
              </Badge>
              <Badge className={`flex items-center gap-1 ${statusInfo.color}`} variant="outline">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
            <CardTitle className="text-lg">{ticket.title}</CardTitle>
          </div>
          
          {canManage && ticket.status !== 'completed' && (
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                data-testid={`button-update-status-${ticket.id}`}
              >
                Update Status
              </Button>
              
              {showStatusMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border p-3 z-10">
                  <div className="space-y-2">
                    {TICKET_STATUSES.map(status => (
                      <Button
                        key={status.value}
                        variant={ticket.status === status.value ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          if (status.value === 'completed') {
                            // Show resolution notes input
                          } else {
                            onUpdateStatus(status.value);
                            setShowStatusMenu(false);
                          }
                        }}
                      >
                        <status.icon className={`h-4 w-4 mr-2 ${status.color}`} />
                        {status.label}
                      </Button>
                    ))}
                    
                    {ticket.status !== 'completed' && (
                      <div className="pt-2 border-t">
                        <Textarea
                          placeholder="Resolution notes (optional)"
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          rows={2}
                          className="mb-2"
                        />
                        <Button
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            onUpdateStatus('completed', resolutionNotes);
                            setShowStatusMenu(false);
                            setResolutionNotes("");
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{ticket.description}</p>
        
        {/* Status Progress */}
        <div className="flex items-center gap-2 mb-3">
          {TICKET_STATUSES.map((status, index) => {
            const currentIndex = TICKET_STATUSES.findIndex(s => s.value === ticket.status);
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <div key={status.value} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                } ${isCurrent ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
                  <status.icon className="h-4 w-4" />
                </div>
                {index < TICKET_STATUSES.length - 1 && (
                  <div className={`w-8 h-0.5 ${isCompleted && index < currentIndex ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Submitted by {ticket.submitterName}</span>
          <span>{ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, yyyy') : 'Unknown'}</span>
        </div>
        
        {ticket.resolutionNotes && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">Resolution:</p>
            <p className="text-sm text-green-700 dark:text-green-300">{ticket.resolutionNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
