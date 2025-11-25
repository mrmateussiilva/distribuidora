import { useEffect, useState, useCallback, useMemo } from "react";
import { useProductsStore } from "../state/productsStore";
import { stockApi } from "../api/stock";
import { productsApi } from "../api/products";
import { useAuthStore } from "@/state/authStore";
import type { StockMovementWithProduct, Product, UpdateProductPayload } from "../types";
import { Plus, Edit, Trash2, Warehouse, History, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type TabType = "stock" | "movements";

export default function Stock() {
  const products = useProductsStore((state) => state.products);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);
  const user = useAuthStore((state) => state.user);
  
  const [activeTab, setActiveTab] = useState<TabType>("stock");
  const [movements, setMovements] = useState<StockMovementWithProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  
  // Modal de movimentação
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  
  // Modal de edição de produto
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateProductPayload>({});
  
  // Modal de exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    if (activeTab === "movements") {
      loadMovements();
    }
  }, [fetchProducts, activeTab]);

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

  const handleMovement = useCallback(async () => {
    if (!selectedProduct || quantity <= 0) {
      alert("Selecione um produto e informe a quantidade");
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  }, [selectedProduct, quantity, movementType, fetchProducts, loadMovements]);

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      stock_full: product.stock_full,
      stock_empty: product.stock_empty,
    });
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingProduct) return;

    setLoading(true);
    try {
      await productsApi.update(editingProduct.id, editFormData);
      await fetchProducts();
      setShowEditModal(false);
      setEditingProduct(null);
      setEditFormData({});
    } catch (error) {
      alert("Erro ao atualizar produto: " + error);
    } finally {
      setLoading(false);
    }
  }, [editingProduct, editFormData, fetchProducts]);

  const handleDeleteClick = useCallback((product: Product) => {
    setProductToDelete(product);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!productToDelete) return;

    setLoading(true);
    try {
      await productsApi.delete(productToDelete.id);
      await fetchProducts();
      setShowDeleteDialog(false);
      setProductToDelete(null);
    } catch (error) {
      alert("Erro ao excluir produto: " + error);
    } finally {
      setLoading(false);
    }
  }, [productToDelete, fetchProducts]);

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [movements]);

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie o estoque de produtos e visualize movimentações
          </p>
        </div>
        {activeTab === "stock" && (
          <Button onClick={() => setShowMovementModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Movimentação
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "stock"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Estoque Atual
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
        {activeTab === "stock" ? (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="w-5 h-5" />
                Produtos em Estoque
              </CardTitle>
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
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Estoque Cheio</TableHead>
                        <TableHead className="text-center">Estoque Vazio</TableHead>
                        <TableHead className="text-right">Preço Cheio</TableHead>
                        <TableHead className="text-right">Preço Recarga</TableHead>
                        <TableHead className="text-center w-[120px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell className="text-center">
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
                          <TableCell className="text-center">
                            {product.stock_empty}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {product.price_full.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {product.price_refill.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(product)}
                                title="Editar estoque"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {user?.role === "admin" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteClick(product)}
                                  title="Excluir produto"
                                >
                                  <Trash2 className="w-4 h-4" />
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
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Histórico de Movimentações
                </CardTitle>
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
            <Button onClick={handleMovement} disabled={loading}>
              {loading ? "Processando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Estoque</DialogTitle>
            <DialogDescription>
              Atualize o estoque do produto: {editingProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stock-full">Estoque Cheio</Label>
              <Input
                id="stock-full"
                type="number"
                min="0"
                value={editFormData.stock_full ?? editingProduct?.stock_full ?? 0}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    stock_full: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-empty">Estoque Vazio</Label>
              <Input
                id="stock-empty"
                type="number"
                min="0"
                value={editFormData.stock_empty ?? editingProduct?.stock_empty ?? 0}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    stock_empty: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingProduct(null);
                setEditFormData({});
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
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
              {loading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
