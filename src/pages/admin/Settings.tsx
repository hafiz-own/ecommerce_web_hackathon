import { useState } from "react";
import { Save, Store, Bot, Database, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { reindexEmbeddings } from "@/lib/api/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const AdminSettings = () => {
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  // Store Settings
  const [storeName, setStoreName] = useState("TrendZone");
  const [storeDescription, setStoreDescription] = useState(
    "Your AI-powered fashion destination"
  );

  // AI Clerk Settings
  const [clerkEnabled, setClerkEnabled] = useState(true);
  const [haggleEnabled, setHaggleEnabled] = useState(true);
  const [maxDiscount, setMaxDiscount] = useState(20);
  const [clerkGreeting, setClerkGreeting] = useState(
    "Hi! I'm The Clerk, your AI personal shopper. How can I help you today?"
  );

  // Notification Settings
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  const handleSave = async () => {
    setSaving(true);
    // Simulate saving settings
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Settings saved successfully");
    setSaving(false);
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const result = await reindexEmbeddings();
      if (!result?.success) {
        toast.error('Failed to reindex embeddings');
        return;
      }
      toast.success(`Reindexed embeddings for ${result.count} products`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reindex embeddings');
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your store configuration
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Store Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Store Information</CardTitle>
          </div>
          <CardDescription>Basic store settings and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeDescription">Store Description</Label>
              <Input
                id="storeDescription"
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Search Index</CardTitle>
              <CardDescription>
                Rebuild vector embeddings after product/tag updates for better semantic search.
              </CardDescription>
            </div>
            <Button onClick={handleReindex} disabled={reindexing}>
              {reindexing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reindex Embeddings
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* AI Clerk Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <CardTitle>AI Clerk Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure your AI personal shopper behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable AI Clerk</Label>
              <p className="text-sm text-muted-foreground">
                Show the AI chatbot on your store
              </p>
            </div>
            <Switch checked={clerkEnabled} onCheckedChange={setClerkEnabled} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Haggle Mode</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to negotiate discounts with the AI
              </p>
            </div>
            <Switch checked={haggleEnabled} onCheckedChange={setHaggleEnabled} />
          </div>

          {haggleEnabled && (
            <div className="space-y-2">
              <Label>Maximum Discount (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                The maximum discount the AI can offer during haggling
              </p>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label>Clerk Greeting Message</Label>
            <Textarea
              value={clerkGreeting}
              onChange={(e) => setClerkGreeting(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              The first message customers see when opening the chat
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Database / Environment Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Environment Status</CardTitle>
          </div>
          <CardDescription>Check your configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    import.meta.env.VITE_SUPABASE_URL ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <div>
                  <p className="font-medium text-sm">Supabase Connection</p>
                  <p className="text-xs text-muted-foreground">
                    {import.meta.env.VITE_SUPABASE_URL
                      ? "Connected"
                      : "Not configured"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    import.meta.env.VITE_GEMINI_API_KEY ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
                <div>
                  <p className="font-medium text-sm">Gemini AI</p>
                  <p className="text-xs text-muted-foreground">
                    {import.meta.env.VITE_GEMINI_API_KEY
                      ? "Connected"
                      : "Not configured (AI features disabled)"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Notifications & Alerts</CardTitle>
          </div>
          <CardDescription>Configure alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Order Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new orders are placed
              </p>
            </div>
            <Switch
              checked={orderNotifications}
              onCheckedChange={setOrderNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Low Stock Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when products are running low
              </p>
            </div>
            <Switch checked={lowStockAlerts} onCheckedChange={setLowStockAlerts} />
          </div>

          {lowStockAlerts && (
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Alert when stock falls below this number
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Clear All Coupons</p>
              <p className="text-xs text-muted-foreground">
                Delete all AI-generated and manual coupons
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Clear Coupons
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Reset AI Clerk Memory</p>
              <p className="text-xs text-muted-foreground">
                Clear conversation history and learned preferences
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Reset Memory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
