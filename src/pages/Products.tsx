import { useEffect, useState, useCallback, useMemo } from "react";
import { useProductsStore } from "../state/productsStore";
import { useAuthStore } from "@/state/authStore";
import { productsApi } from "../api/products";
import { stockApi } from "../api/stock";
import type { Product, CreateProductPayload, StockMovementWithProduct } from "../types";
import { Plus, Edit, Trash2, Package, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TabType = "products" | "movements";

export default function Products() {
  const products = useProductsStore((state) => state.products);
  const loading = useProductsStore((state) => state.loading);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);
  const user = useAuthStore((state) => state.user);
  
  const [activeTab, setActiveTab] = useState<TabType>("products");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductPayload>({
    name: "",
    description: "",
    type: "water",
    price_refill: 0,
    price_full: 0,
    stock_full: 0,
    stock_empty: 0,
    expiry_month: null,
    expiry_year: null,
  });

  // Estados para movimentações
  const [movements, setMovements] = useState<StockMovementWithProduct[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [movementLoading, setMovementLoading] = useState(false);

  // Estados para exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    if (activeTab === "movements") {
      loadMovements();
    }
  }, [fetchProducts, activeTab]);

  // Resetar formulário quando abrir modal para novo produto
  useEffect(() => {
    if (showModal && !editingProduct) {
      setFormData({
        name: "",
        description: "",
        type: "water",
        price_refill: 0,
        price_full: 0,
        stock_full: 0,
        stock_empty: 0,
        expiry_month: null,
        expiry_year: null,
      });
    }
  }, [showModal, editingProduct]);

  const loadMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const data = await stockApi.getMovements();
      setMovements(data);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
        await fetchProducts();
      } else {
        await productsApi.create(formData);
        await fetchProducts();
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        type: "water",
        price_refill: 0,
        price_full: 0,
        stock_full: 0,
        stock_empty: 0,
        expiry_month: null,
        expiry_year: null,
      });
    } catch (error) {
      alert("Erro ao salvar produto: " + error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      type: product.type,
      price_refill: product.price_refill,
      price_full: product.price_full,
      stock_full: product.stock_full,
      stock_empty: product.stock_empty,
      expiry_month: product.expiry_month,
      expiry_year: product.expiry_year,
    });
    setShowModal(true);
  };

  const handleDeleteClick = useCallback((product: Product) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!productToDelete) return;

    setDeleteLoading(true);
    try {
      await productsApi.delete(productToDelete.id);
      await fetchProducts();
      setShowDeleteDialog(false);
      setProductToDelete(null);
      } catch (error) {
        alert("Erro ao excluir produto: " + error);
    } finally {
      setDeleteLoading(false);
    }
  }, [productToDelete, fetchProducts]);

  const handleMovement = useCallback(async () => {
    if (!selectedProduct || quantity <= 0) {
      alert("Selecione um produto e informe a quantidade");
      return;
    }

    setMovementLoading(true);
    try {
      switch (movementType) {
        case "IN":
          await stockApi.stockIn(selectedProduct, quantity);
          break;
        case "OUT":
          await stockApi.stockOut(selectedProduct, quantity);
          break;
        case "ADJUST":
          await stockApi.stockAdjust(selectedProduct, quantity);
          break;
      }
      await fetchProducts();
      await loadMovements();
      setShowMovementModal(false);
      setSelectedProduct(null);
      setQuantity(0);
    } catch (error) {
      alert("Erro ao realizar movimentação: " + error);
    } finally {
      setMovementLoading(false);
    }
  }, [selectedProduct, quantity, movementType, fetchProducts, loadMovements]);

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [movements]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      water: "Água",
      gas: "Gás",
      coal: "Carvão",
      other: "Outro",
    };
    return labels[type] || type;
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    if (type === "water") return "default";
    if (type === "gas") return "destructive";
    return "secondary";
  };

  if (loading && activeTab === "products") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie seus produtos, estoque e movimentações
          </p>
        </div>
        {activeTab === "products" && (
        <Button
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              name: "",
              description: "",
              type: "water",
              price_refill: 0,
              price_full: 0,
              stock_full: 0,
              stock_empty: 0,
              expiry_month: null,
              expiry_year: null,
            });
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
        )}
        {activeTab === "movements" && (
          <Button onClick={() => setShowMovementModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Movimentação
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "products"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab("movements");
            loadMovements();
          }}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "movements"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Movimentações
          </div>
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "products" ? (
          <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            Todos os produtos cadastrados no sistema
          </CardDescription>
        </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {products.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">
                    Nenhum produto cadastrado
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Preço (com casco)</TableHead>
                <TableHead>Preço (sem casco)</TableHead>
                <TableHead>Estoque Cheio</TableHead>
                <TableHead>Estoque Vazio</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                  <TableCell>
                    <Badge variant={getTypeVariant(product.type)}>
                      {getTypeLabel(product.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>R$ {product.price_refill.toFixed(2)}</TableCell>
                  <TableCell>R$ {product.price_full.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                product.stock_full === 0
                                  ? "destructive"
                                  : product.stock_full < 10
                                  ? "secondary"
                                  : "default"
                              }
                            >
                    {product.stock_full}
                            </Badge>
                  </TableCell>
                  <TableCell>{product.stock_empty}</TableCell>
                  <TableCell>
                    {product.type === "water" && product.expiry_month && product.expiry_year ? (
                      <span className="text-sm">
                        {String(product.expiry_month).padStart(2, "0")}/{product.expiry_year}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                                title="Editar produto"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                              {user?.role === "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                                  onClick={() => handleDeleteClick(product)}
                                  title="Excluir produto"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Movimentações</CardTitle>
                  <CardDescription>
                    Registro de todas as movimentações de estoque
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={loadMovements}
                  title="Atualizar"
                >
                  <History className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {loadingMovements ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                </div>
              ) : sortedMovements.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma movimentação registrada
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            {new Date(movement.created_at).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {movement.product_name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                movement.movement_type === "IN"
                                  ? "default"
                                  : movement.movement_type === "OUT"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {movement.movement_type === "IN"
                                ? "ENTRADA"
                                : movement.movement_type === "OUT"
                                ? "SAÍDA"
                                : "AJUSTE"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <span
                              className={
                                movement.movement_type === "OUT"
                                  ? "text-destructive"
                                  : "text-green-600"
                              }
                            >
                              {movement.movement_type === "OUT" ? "-" : "+"}
                              {movement.quantity}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
        </CardContent>
      </Card>
        )}
      </div>

      {/* Dialog de Produto */}
      <Dialog 
        open={showModal} 
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            // Resetar formulário quando fechar
            setEditingProduct(null);
            setFormData({
              name: "",
              description: "",
              type: "water",
              price_refill: 0,
              price_full: 0,
              stock_full: 0,
              stock_empty: 0,
              expiry_month: null,
              expiry_year: null,
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Atualize as informações do produto"
                : "Adicione um novo produto ao sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    type: value as any,
                  })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="water">Água</SelectItem>
                  <SelectItem value="gas">Gás</SelectItem>
                  <SelectItem value="coal">Carvão</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_refill">Preço (com casco)</Label>
                <Input
                  id="price_refill"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price_refill || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_refill: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_full">Preço (sem casco)</Label>
                <Input
                  id="price_full"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price_full || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_full: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock_full">Estoque Cheio</Label>
                <Input
                  id="stock_full"
                  type="number"
                  value={formData.stock_full || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock_full: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_empty">Estoque Vazio</Label>
                <Input
                  id="stock_empty"
                  type="number"
                  value={formData.stock_empty || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock_empty: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            {formData.type === "water" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry_month">Mês de Vencimento</Label>
                  <Select
                    value={formData.expiry_month?.toString() || undefined}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        expiry_month: value ? parseInt(value) : null,
                      })
                    }
                  >
                    <SelectTrigger id="expiry_month">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {String(month).padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry_year">Ano de Vencimento</Label>
                  <Input
                    id="expiry_year"
                    type="number"
                    min={new Date().getFullYear()}
                    max={new Date().getFullYear() + 10}
                    value={formData.expiry_year || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expiry_year: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Ex: 2024"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Movimentação */}
      <Dialog open={showMovementModal} onOpenChange={setShowMovementModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
            <DialogDescription>
              Registre uma entrada, saída ou ajuste no estoque
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="movement-type">Tipo de Movimentação</Label>
              <Select
                value={movementType}
                onValueChange={(value) =>
                  setMovementType(value as "IN" | "OUT" | "ADJUST")
                }
              >
                <SelectTrigger id="movement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Entrada</SelectItem>
                  <SelectItem value="OUT">Saída</SelectItem>
                  <SelectItem value="ADJUST">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Produto</Label>
              <Select
                value={selectedProduct?.toString() || ""}
                onValueChange={(value) =>
                  setSelectedProduct(parseInt(value) || null)
                }
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity || ""}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                placeholder="Digite a quantidade"
              />
              {movementType === "ADJUST" && (
                <p className="text-xs text-muted-foreground">
                  Use valores negativos para reduzir o estoque
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMovementModal(false);
                setSelectedProduct(null);
                setQuantity(0);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleMovement} disabled={movementLoading}>
              {movementLoading ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto{" "}
              <strong>{productToDelete?.name}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
