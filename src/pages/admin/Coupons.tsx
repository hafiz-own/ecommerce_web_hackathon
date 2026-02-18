import { useState, useEffect } from "react";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Loader2,
  Tag,
  Bot,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getAdminCoupons, createCoupon, deleteCoupon, type Coupon, type CouponFormData } from "@/lib/api/admin";
import { format } from "date-fns";
import { toast } from "sonner";

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CouponFormData>({
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    min_purchase: undefined,
    max_discount: undefined,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: undefined,
    usage_limit: undefined,
    reason: "",
  });

  const limit = 20;

  useEffect(() => {
    loadCoupons();
  }, [page]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const { coupons: data, total: totalCount } = await getAdminCoupons(page, limit);
      setCoupons(data);
      setTotal(totalCount);
    } catch (error) {
      console.error("Error loading coupons:", error);
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    if (formData.discount_value <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      await createCoupon({
        ...formData,
        valid_from: formData.valid_from || new Date().toISOString(),
        valid_until: formData.valid_until || undefined,
      });
      toast.success("Coupon created successfully");
      setCreateDialogOpen(false);
      resetForm();
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!couponToDelete) return;

    setDeleting(true);
    try {
      await deleteCoupon(couponToDelete.id);
      toast.success("Coupon deleted successfully");
      loadCoupons();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete coupon");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: 10,
      min_purchase: undefined,
      max_discount: undefined,
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: undefined,
      usage_limit: undefined,
      reason: "",
    });
  };

  const generateRandomCode = () => {
    const prefixes = ["SAVE", "DEAL", "SALE", "PROMO", "SHOP"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    setFormData((prev) => ({ ...prev, code: `${prefix}-${suffix}` }));
  };

  const isExpired = (coupon: Coupon) => {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  };

  const isActive = (coupon: Coupon) => {
    const now = new Date();
    const from = new Date(coupon.valid_from);
    const until = coupon.valid_until ? new Date(coupon.valid_until) : null;
    return from <= now && (!until || until >= now);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
          <p className="text-muted-foreground">
            Manage discount codes and promotions
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
              <DialogDescription>
                Create a new discount code for your customers
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Coupon Code *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g., SAVE20"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={generateRandomCode}
                  >
                    Generate
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        discount_type: val as "percentage" | "fixed",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Discount Value {formData.discount_type === "percentage" ? "(%)" : "($)"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step={formData.discount_type === "percentage" ? "1" : "0.01"}
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        discount_value: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min. Purchase ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.min_purchase || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        min_purchase: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    placeholder="No minimum"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max. Discount ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.max_discount || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        max_discount: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    placeholder="No maximum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valid From</Label>
                  <Input
                    type="date"
                    value={formData.valid_from?.split("T")[0] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        valid_from: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={formData.valid_until?.split("T")[0] || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        valid_until: e.target.value || undefined,
                      }))
                    }
                    placeholder="No expiry"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.usage_limit || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      usage_limit: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                  placeholder="Unlimited"
                />
              </div>

              <div className="space-y-2">
                <Label>Reason / Description</Label>
                <Input
                  value={formData.reason || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="e.g., Summer Sale, Birthday Discount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Coupon
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No coupons found</h3>
              <p className="text-muted-foreground">
                Create your first coupon to offer discounts
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  resetForm();
                  setCreateDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Coupon
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <code className="bg-secondary px-2 py-1 rounded text-sm font-mono font-bold">
                          {coupon.code}
                        </code>
                        {coupon.reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {coupon.reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {coupon.discount_type === "percentage"
                          ? `${coupon.discount_value}%`
                          : `$${coupon.discount_value}`}
                        {coupon.min_purchase && (
                          <span className="text-xs text-muted-foreground block">
                            Min. ${coupon.min_purchase}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.usage_limit
                          ? `${coupon.used_count}/${coupon.usage_limit}`
                          : `${coupon.used_count} used`}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{format(new Date(coupon.valid_from), "MMM d, yyyy")}</div>
                        <div className="text-muted-foreground">
                          {coupon.valid_until
                            ? `to ${format(new Date(coupon.valid_until), "MMM d, yyyy")}`
                            : "No expiry"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isExpired(coupon) ? (
                          <Badge variant="secondary">Expired</Badge>
                        ) : isActive(coupon) ? (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Scheduled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.created_by_agent ? (
                          <Badge variant="outline" className="gap-1">
                            <Bot className="h-3 w-3" />
                            AI Clerk
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <User className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(coupon.code);
                                toast.success("Coupon code copied!");
                              }}
                            >
                              Copy Code
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCouponToDelete(coupon);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to{" "}
                    {Math.min(page * limit, total)} of {total} coupons
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete coupon "{couponToDelete?.code}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCoupons;
