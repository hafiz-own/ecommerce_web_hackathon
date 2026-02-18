import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  getCategories,
  type ProductFormData,
} from "@/lib/api/admin";
import { getProductByIdUniversal, type Product } from "@/lib/api/products";
import { toast } from "sonner";

const defaultCategories = ["Clothes", "Shoes", "Bags", "Accessories"];

const commonSizes = {
  Clothes: ["XS", "S", "M", "L", "XL", "XXL"],
  Shoes: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  Bags: ["One Size"],
  Accessories: ["One Size", "S", "M", "L"],
};

const commonColors = [
  "Black", "White", "Navy", "Gray", "Brown", "Beige", "Red", "Blue",
  "Green", "Yellow", "Pink", "Purple", "Orange", "Burgundy", "Olive",
];

const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<string[]>(defaultCategories);

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    category: "",
    sizes: [],
    colors: [],
    stock: 0,
    tags: [],
    metadata: {},
  });

  const [newTag, setNewTag] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newCategory, setNewCategory] = useState("");

  // Metadata fields
  const [season, setSeason] = useState("");
  const [occasion, setOccasion] = useState("");
  const [style, setStyle] = useState("");
  const [tryOnEnabled, setTryOnEnabled] = useState(false);

  useEffect(() => {
    loadCategories();
    if (isEdit && id) {
      loadProduct(id);
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats.length > 0 ? cats : defaultCategories);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadProduct = async (productId: string) => {
    setLoading(true);
    try {
      const product = await getProductByIdUniversal(productId);
      if (product) {
        setFormData({
          name: product.name,
          description: product.description,
          price: product.price,
          image_url: product.image_url,
          category: product.category,
          sizes: product.sizes || [],
          colors: product.colors || [],
          stock: product.stock,
          tags: product.tags || [],
          metadata: product.metadata || {},
        });
        // Load metadata
        if (product.metadata) {
          setSeason(product.metadata.season || "");
          setOccasion(Array.isArray(product.metadata.occasion) 
            ? product.metadata.occasion.join(", ") 
            : product.metadata.occasion || "");
          setStyle(product.metadata.style || "");
          setTryOnEnabled(product.metadata.try_on_enabled || false);
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadProductImage(file);
      if (imageUrl) {
        setFormData((prev) => ({ ...prev, image_url: imageUrl.url }));
        toast.success("Image uploaded successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (formData.price <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    if (!formData.category) {
      toast.error("Category is required");
      return;
    }
    if (formData.sizes.length === 0) {
      toast.error("At least one size is required");
      return;
    }
    if (!formData.image_url || formData.image_url.trim() === "") {
      toast.error("Product image is required");
      return;
    }

    // Build metadata
    const metadata: Record<string, any> = {};
    if (season) metadata.season = season;
    if (occasion) {
      metadata.occasion = occasion.includes(",") 
        ? occasion.split(",").map((o) => o.trim()) 
        : occasion;
    }
    if (style) metadata.style = style;
    metadata.try_on_enabled = tryOnEnabled;

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        metadata,
      };

      if (isEdit && id) {
        await updateProduct(id, dataToSave);
        toast.success("Product updated successfully");
      } else {
        await createProduct(dataToSave);
        toast.success("Product created successfully");
      }
      navigate("/admin/products");
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const addSize = (size: string) => {
    if (size && !formData.sizes.includes(size)) {
      setFormData((prev) => ({ ...prev, sizes: [...prev.sizes, size] }));
    }
    setNewSize("");
  };

  const removeSize = (size: string) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((s) => s !== size),
    }));
  };

  const addColor = (color: string) => {
    if (color && !formData.colors.includes(color)) {
      setFormData((prev) => ({ ...prev, colors: [...prev.colors, color] }));
    }
    setNewColor("");
  };

  const removeColor = (color: string) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((c) => c !== color),
    }));
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag.toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.toLowerCase()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const addNewCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories((prev) => [...prev, newCategory]);
      setFormData((prev) => ({ ...prev, category: newCategory }));
      setNewCategory("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Product" : "Add New Product"}
          </h2>
          <p className="text-muted-foreground">
            {isEdit ? "Update product details" : "Create a new product"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Product name, description, and category
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter product name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter product description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Or Add New Category</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New category"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={addNewCategory}
                        disabled={!newCategory}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Inventory</CardTitle>
                <CardDescription>Set price and stock levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          stock: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sizes */}
            <Card>
              <CardHeader>
                <CardTitle>Sizes *</CardTitle>
                <CardDescription>Available sizes for this product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Add Sizes */}
                {formData.category && commonSizes[formData.category as keyof typeof commonSizes] && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Quick add:</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {commonSizes[formData.category as keyof typeof commonSizes].map((size) => (
                        <Button
                          key={size}
                          type="button"
                          variant={formData.sizes.includes(size) ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            formData.sizes.includes(size) ? removeSize(size) : addSize(size)
                          }
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Size */}
                <div className="flex gap-2">
                  <Input
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    placeholder="Add custom size"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSize(newSize))}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addSize(newSize)}
                    disabled={!newSize}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Selected Sizes */}
                {formData.sizes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.sizes.map((size) => (
                      <Badge key={size} variant="secondary">
                        {size}
                        <button
                          type="button"
                          onClick={() => removeSize(size)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Colors */}
            <Card>
              <CardHeader>
                <CardTitle>Colors</CardTitle>
                <CardDescription>Available colors (optional)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Add Colors */}
                <div>
                  <Label className="text-xs text-muted-foreground">Quick add:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {commonColors.slice(0, 10).map((color) => (
                      <Button
                        key={color}
                        type="button"
                        variant={formData.colors.includes(color) ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          formData.colors.includes(color) ? removeColor(color) : addColor(color)
                        }
                      >
                        {color}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Color */}
                <div className="flex gap-2">
                  <Input
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="Add custom color"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addColor(newColor))}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addColor(newColor)}
                    disabled={!newColor}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Selected Colors */}
                {formData.colors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.colors.map((color) => (
                      <Badge key={color} variant="secondary">
                        {color}
                        <button
                          type="button"
                          onClick={() => removeColor(color)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags & Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Tags & Metadata</CardTitle>
                <CardDescription>
                  Tags help with search and AI recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" variant="secondary" onClick={addTag} disabled={!newTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Metadata */}
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Season</Label>
                      <Select value={season} onValueChange={setSeason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Seasons</SelectItem>
                          <SelectItem value="spring">Spring</SelectItem>
                          <SelectItem value="summer">Summer</SelectItem>
                          <SelectItem value="fall">Fall</SelectItem>
                          <SelectItem value="winter">Winter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Occasion</Label>
                      <Input
                        value={occasion}
                        onChange={(e) => setOccasion(e.target.value)}
                        placeholder="casual, wedding, etc."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Style</Label>
                      <Input
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        placeholder="minimal, classic, etc."
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="try_on_enabled"
                      checked={tryOnEnabled}
                      onChange={(e) => setTryOnEnabled(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="try_on_enabled" className="text-sm font-medium">
                      Enable Virtual Try-On
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Product Image</CardTitle>
                <CardDescription>Upload a product image</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Product"
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Change
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center hover:border-primary transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Max 5MB
                        </span>
                      </>
                    )}
                  </button>
                )}

                {/* Or enter URL */}
                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground">
                    Or enter image URL
                  </Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, image_url: e.target.value }))
                    }
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEdit ? "Update Product" : "Create Product"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/admin/products")}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
