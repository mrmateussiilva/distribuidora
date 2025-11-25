import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useProductsStore } from "../state/productsStore";
import { useCustomersStore } from "../state/customersStore";
import { useCartStore } from "../state/cartStore";
import { useAuthStore } from "@/state/authStore";
import { ordersApi } from "../api/orders";
import { receiptsApi } from "../api/receipts";
import type { Customer, Product, OrderWithCustomer, OrderWithItems } from "../types";
import {
  CheckCircle2, Trash2, Copy,
  RotateCcw, AlertTriangle,
  History, Eye, FileText, ShoppingCart, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ReceiptRow {
  id: number;
  product: Product | null;
  quantity: number;
  unitPrice: number;
  customPrice?: number;
  returnedBottle: boolean;
}

export default function POS() {
  const products = useProductsStore((state) => state.products);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);
  const customers = useCustomersStore((state) => state.customers);
  const fetchCustomers = useCustomersStore((state) => state.fetchCustomers);
  const getItemPrice = useCartStore((state) => state.getItemPrice);
  const user = useAuthStore((state) => state.user);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [rows, setRows] = useState<ReceiptRow[]>([
    { id: 1, product: null, quantity: 1, unitPrice: 0, returnedBottle: false },
  ]);
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
  const [nextRowId, setNextRowId] = useState(2);
  const [lastOrderTotal, setLastOrderTotal] = useState<number | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderWithCustomer[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [editingOrderDate, setEditingOrderDate] = useState<{ orderId: number; date: string } | null>(null);
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: "info" | "error" | "success" | "confirm";
    onConfirm?: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    type: "info",
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const loadRecentOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const orders = await ordersApi.getAll();
      // Pega as últimas vendas, ordenadas por data (mais recentes primeiro)
      const sorted = orders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentOrders(sorted);
    } catch (error) {
      console.error("Erro ao carregar últimas vendas:", error);
      setRecentOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    loadRecentOrders();
  }, [fetchProducts, fetchCustomers, loadRecentOrders]);

  const nextOrderId = useMemo(() => {
    if (recentOrders.length === 0) return 1;
    // Encontra o maior ID entre todos os pedidos
    const maxId = Math.max(...recentOrders.map(order => order.id));
    return maxId + 1;
  }, [recentOrders]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const calculateRowTotal = useCallback((row: ReceiptRow) => {
    if (!row.product) return 0;
    const price = row.customPrice !== undefined ? row.customPrice : getItemPrice({
      product: row.product,
      quantity: row.quantity,
      returnedBottle: row.returnedBottle,
    });
    return price * row.quantity;
  }, [getItemPrice]);

  const showAlert = useCallback((title: string, message: string, type: "info" | "error" | "success" = "info") => {
    setAlertDialog({
      open: true,
      title,
      message,
      type,
    });
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setAlertDialog({
      open: true,
      title,
      message,
      type: "confirm",
      onConfirm,
    });
  }, []);

  const clearAll = useCallback(() => {
    setRows([
      { id: 1, product: null, quantity: 1, unitPrice: 0, returnedBottle: false },
    ]);
    setNextRowId(2);
    setSelectedCustomer(null);
  }, []);

  const totalAmount = useMemo(() => {
    return rows.reduce((total, row) => total + calculateRowTotal(row), 0);
  }, [rows, calculateRowTotal]);

  const totalQuantity = useMemo(() => {
    return rows.reduce((total, row) => total + (row.product ? row.quantity : 0), 0);
  }, [rows]);

  const lowStockProducts = useMemo(() => {
    return rows.filter((r) => r.product && r.product.stock_full < r.quantity);
  }, [rows]);

  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return recentOrders;
    const searchLower = orderSearch.toLowerCase();
    return recentOrders.filter((order) => (
      order.id.toString().includes(searchLower) ||
      (order.customer_name?.toLowerCase().includes(searchLower) ?? false) ||
      order.total.toString().includes(searchLower)
    ));
  }, [recentOrders, orderSearch]);

  const handleCheckout = useCallback(async () => {
    const validRows = rows.filter((row) => row.product !== null && row.quantity > 0);

    if (validRows.length === 0) {
      showAlert("Atenção", "Adicione pelo menos um produto à venda", "error");
      return;
    }

    // Valida estoque
    const lowStockRows = validRows.filter((row) =>
      row.product && row.quantity > row.product.stock_full
    );
    if (lowStockRows.length > 0) {
      const productNames = lowStockRows.map((r) => r.product!.name).join(", ");
      showAlert("Estoque Insuficiente", `Estoque insuficiente para: ${productNames}`, "error");
      return;
    }

    try {
      const orderItems = validRows.map((row) => {
        const price = row.customPrice !== undefined
          ? row.customPrice
          : getItemPrice({
              product: row.product!,
              quantity: row.quantity,
              returnedBottle: row.returnedBottle,
            });

        return {
          product_id: row.product!.id,
          quantity: row.quantity,
          returned_bottle: row.returnedBottle,
          unit_price: price,
        };
      });

      await ordersApi.create({
        customer_id: selectedCustomer?.id || null,
        items: orderItems,
      });

      setLastOrderTotal(totalAmount);
      clearAll();
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
      await fetchProducts();
      await loadRecentOrders();
      setShowNewSaleModal(false);
    } catch (error) {
      showAlert("Erro", "Erro ao finalizar pedido: " + error, "error");
    }
  }, [rows, selectedCustomer, getItemPrice, clearAll, fetchProducts, showAlert, totalAmount]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape para cancelar edição
      if (e.key === "Escape") {
        setEditingCell(null);
        return;
      }
      // Ctrl+Enter para finalizar venda
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && showNewSaleModal) {
        e.preventDefault();
        const validRows = rows.filter((r) => r.product && r.quantity > 0);
        const lowStockRows = validRows.filter((r) =>
          r.product && r.quantity > r.product.stock_full
        );
        if (validRows.length > 0 && lowStockRows.length === 0) {
          handleCheckout();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, showNewSaleModal, handleCheckout]);

  const handleProductChange = useCallback((rowId: number, productId: string) => {
    const product = products.find((p) => p.id === parseInt(productId));
    if (product) {
      setRows((prev) => {
        const updated = prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                product,
                unitPrice: product.price_full,
                customPrice: undefined,
                quantity: row.quantity || 1,
              }
            : row
        );
        
        // Verifica se há uma linha vazia após atualizar
        const hasEmptyRow = updated.some((row) => !row.product);
        
        // Se não houver linha vazia, adiciona uma nova
        if (!hasEmptyRow) {
          // Calcula o próximo ID baseado no maior ID atual
          const maxId = Math.max(...updated.map(r => r.id), 0);
          const newRowId = maxId + 1;
          
          // Atualiza o nextRowId para o próximo valor disponível
          setNextRowId(newRowId + 1);
          
          return [
            ...updated,
            {
              id: newRowId,
              product: null,
              quantity: 1,
              unitPrice: 0,
              returnedBottle: false,
            },
          ];
        }
        
        return updated;
      });
      
      setTimeout(() => {
        setEditingCell({ rowId, field: "quantity" });
      }, 100);
    }
  }, [products, nextRowId]);

  const duplicateRow = useCallback((rowId: number) => {
    const row = rows.find((r) => r.id === rowId);
    if (row && row.product) {
      const newRow: ReceiptRow = {
        id: nextRowId,
        product: row.product,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        customPrice: row.customPrice,
        returnedBottle: row.returnedBottle,
      };
      setRows((prev) => {
        const index = prev.findIndex((r) => r.id === rowId);
        return [...prev.slice(0, index + 1), newRow, ...prev.slice(index + 1)];
      });
      setNextRowId((prev) => prev + 1);
    }
  }, [rows, nextRowId]);

  const handleCellEdit = useCallback((rowId: number, field: string, value: string | number | boolean) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        if (field === "quantity") {
          const qty = Number(value) || 1;
          // Valida estoque
          if (row.product && qty > row.product.stock_full) {
            showAlert("Estoque Insuficiente", `Estoque insuficiente! Disponível: ${row.product.stock_full}`, "error");
            return { ...row, quantity: Math.min(qty, row.product.stock_full) };
          }
          return { ...row, quantity: qty };
        } else if (field === "price") {
          const price = value === "" ? undefined : Number(value);
          return { ...row, customPrice: price };
        } else if (field === "returnedBottle") {
          return { ...row, returnedBottle: value as boolean };
        }
        return row;
      })
    );
    setEditingCell(null);
  }, [rows, showAlert]);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    rowId: number,
    field: string
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      handleCellEdit(rowId, field, target.value);

      if (field === "quantity") {
        setEditingCell({ rowId, field: "price" });
      } else if (field === "price") {
        const currentIndex = rows.findIndex((r) => r.id === rowId);
        if (currentIndex < rows.length - 1) {
          const nextRow = rows[currentIndex + 1];
          if (nextRow.product) {
            setEditingCell({ rowId: nextRow.id, field: "quantity" });
          }
        } else {
          addNewRow();
        }
      }
    } else if (e.key === "Escape") {
      setEditingCell(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      handleCellEdit(rowId, field, target.value);
    } else if (e.key === "ArrowDown" && field === "quantity") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      handleCellEdit(rowId, field, target.value);
      const currentIndex = rows.findIndex((r) => r.id === rowId);
      if (currentIndex < rows.length - 1) {
        setEditingCell({ rowId: rows[currentIndex + 1].id, field: "quantity" });
      }
    } else if (e.key === "ArrowUp" && field === "quantity") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      handleCellEdit(rowId, field, target.value);
      const currentIndex = rows.findIndex((r) => r.id === rowId);
      if (currentIndex > 0) {
        setEditingCell({ rowId: rows[currentIndex - 1].id, field: "quantity" });
      }
    }
  }, [rows, handleCellEdit]);

  const addNewRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: nextRowId,
        product: null,
        quantity: 1,
        unitPrice: 0,
        returnedBottle: false,
      },
    ]);
    setNextRowId((prev) => prev + 1);
  }, [nextRowId]);

  const removeRow = useCallback((rowId: number) => {
    if (rows.length > 1) {
      setRows((prev) => prev.filter((row) => row.id !== rowId));
    }
  }, [rows]);

  const handleViewOrder = useCallback(async (orderId: number) => {
    try {
      const order = await ordersApi.getById(orderId);
      setSelectedOrder(order);
      setShowOrderModal(true);
    } catch (error) {
      showAlert("Erro", "Erro ao carregar detalhes da venda: " + error, "error");
    }
  }, [showAlert]);

  const handleGenerateReceipt = useCallback(async (orderId: number) => {
    try {
      const html = await receiptsApi.generate(orderId);
      // Abre em nova janela para impressão
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (error) {
      showAlert("Erro", "Erro ao gerar recibo: " + error, "error");
    }
  }, [showAlert]);

  const handleDeleteOrder = useCallback(async (orderId: number) => {
    showConfirm(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.",
      async () => {
        try {
          await ordersApi.delete(orderId);
          await loadRecentOrders();
          showAlert("Sucesso", "Venda excluída com sucesso!", "success");
        } catch (error) {
          showAlert("Erro", "Erro ao excluir venda: " + error, "error");
        }
      }
    );
  }, [loadRecentOrders, showAlert, showConfirm]);

  const handleUpdateOrderDate = useCallback(async (orderId: number, newDate: string) => {
    try {
      // Converte a data para o formato ISO
      const dateObj = new Date(newDate);
      const isoDate = dateObj.toISOString();
      
      await ordersApi.update(orderId, { created_at: isoDate });
      await loadRecentOrders();
      
      // Atualiza o pedido selecionado se estiver aberto
      if (selectedOrder && selectedOrder.order.id === orderId) {
        const updatedOrder = await ordersApi.getById(orderId);
        setSelectedOrder(updatedOrder);
      }
      
      setEditingOrderDate(null);
      showAlert("Sucesso", "Data da venda atualizada com sucesso!", "success");
    } catch (error) {
      showAlert("Erro", "Erro ao atualizar data da venda: " + error, "error");
    }
  }, [loadRecentOrders, showAlert, selectedOrder]);

  const handleNewSale = useCallback(() => {
    clearAll();
    setShowNewSaleModal(true);
  }, [clearAll]);

  const handleCustomerChange = useCallback((value: string) => {
    if (value === "none") {
      setSelectedCustomer(null);
    } else {
      const customer = customers.find((c) => c.id === parseInt(value));
      setSelectedCustomer(customer || null);
    }
  }, [customers]);

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground">
            Gerencie suas vendas e notas fiscais
          </p>
        </div>
      </div>

      {/* Barra de pesquisa e botão Nova Venda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar notas por ID, cliente ou valor..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleNewSale} className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Nova Venda
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Últimas Vendas */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5" />
              <CardTitle>Últimas Vendas</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadRecentOrders}
              title="Atualizar"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {loadingOrders ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">
                {orderSearch ? "Nenhuma venda encontrada" : "Nenhuma venda registrada"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right w-[100px]">Total</TableHead>
                    <TableHead className="w-[150px]">Data</TableHead>
                    <TableHead className="w-[120px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        {order.customer_name ? (
                          <span className="text-sm">{order.customer_name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">
                            Consumidor Final
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-600">
                          R$ {order.total.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {editingOrderDate?.orderId === order.id && user?.role === 'admin' ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="datetime-local"
                              defaultValue={new Date(order.created_at).toISOString().slice(0, 16)}
                              onBlur={(e) => {
                                if (e.target.value) {
                                  handleUpdateOrderDate(order.id, e.target.value);
                                } else {
                                  setEditingOrderDate(null);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const target = e.target as HTMLInputElement;
                                  if (target.value) {
                                    handleUpdateOrderDate(order.id, target.value);
                                  }
                                } else if (e.key === "Escape") {
                                  setEditingOrderDate(null);
                                }
                              }}
                              className="w-48 h-8"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div
                            className={user?.role === 'admin' ? "cursor-pointer hover:bg-accent p-1 rounded" : ""}
                            onClick={() => {
                              if (user?.role === 'admin') {
                                setEditingOrderDate({ orderId: order.id, date: order.created_at });
                              }
                            }}
                            title={user?.role === 'admin' ? "Clique para editar a data" : ""}
                          >
                            {new Date(order.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewOrder(order.id)}
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleGenerateReceipt(order.id)}
                            title="Gerar recibo"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteOrder(order.id)}
                              title="Excluir venda"
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

      {/* Modal de Nova Venda */}
      <Dialog open={showNewSaleModal} onOpenChange={setShowNewSaleModal}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] overflow-hidden flex flex-col p-0">
          {/* Mensagem de sucesso */}
          {orderSuccess && (
            <div className="bg-green-50 border-b border-green-200 p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Venda finalizada com sucesso!</p>
                {lastOrderTotal && (
                  <p className="text-sm text-green-700">
                    Total: R$ {lastOrderTotal.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden p-6">
            {/* Cabeçalho simples com Nota, Cliente e Data */}
            <div className="mb-4 pb-4 border-b">
              <div className="mb-3">
                <p className="font-bold text-base">
                  Nota de controle N°.: {String(nextOrderId).padStart(4, '0')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold">CLIENTE:</span>
                  <Select
                    value={selectedCustomer?.id.toString() || "none"}
                    onValueChange={handleCustomerChange}
                  >
                    <SelectTrigger className="h-8 w-[250px]">
                      <SelectValue placeholder="Consumidor Final" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Consumidor Final</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">DATA:</span>
                  <span>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Tabela de Itens */}
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Itens da Venda</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    title="Limpar tudo"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">Produto</TableHead>
                        <TableHead className="font-bold text-center w-24">Quant.</TableHead>
                        <TableHead className="font-bold text-right w-32">Valor Unit.</TableHead>
                        <TableHead className="font-bold text-right w-32">Valor Total</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, index) => (
                        <TableRow key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                          <TableCell>
                            {row.product ? (
                              <div>
                                <p className="font-medium">{row.product.name}</p>
                                {row.returnedBottle && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    com casco
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Select
                                value=""
                                onValueChange={(value) => handleProductChange(row.id, value)}
                              >
                                <SelectTrigger className="w-full h-8">
                                  <SelectValue placeholder="Selecione um produto..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id.toString()}
                                    >
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {editingCell?.rowId === row.id && editingCell.field === "quantity" ? (
                              <Input
                                ref={inputRef}
                                type="number"
                                min="1"
                                defaultValue={row.quantity}
                                onBlur={(e) =>
                                  handleCellEdit(row.id, "quantity", e.target.value)
                                }
                                onKeyDown={(e) =>
                                  handleKeyDown(e, row.id, "quantity")
                                }
                                className="w-20 h-8 text-center"
                              />
                            ) : (
                              <div
                                className="cursor-pointer hover:bg-accent p-1 rounded text-center"
                                onClick={() => setEditingCell({ rowId: row.id, field: "quantity" })}
                              >
                                {row.quantity}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.product && (
                              <div>
                                {editingCell?.rowId === row.id && editingCell.field === "price" ? (
                                  <Input
                                    ref={inputRef}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    defaultValue={row.customPrice || getItemPrice({
                                      product: row.product,
                                      quantity: row.quantity,
                                      returnedBottle: row.returnedBottle,
                                    })}
                                    onBlur={(e) =>
                                      handleCellEdit(row.id, "price", e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                      handleKeyDown(e, row.id, "price")
                                    }
                                    className="w-28 h-8 text-right"
                                  />
                                ) : (
                                  <div
                                    className="cursor-pointer hover:bg-accent p-1 rounded text-right"
                                    onClick={() => setEditingCell({ rowId: row.id, field: "price" })}
                                  >
                                    R$ {(row.customPrice !== undefined
                                      ? row.customPrice
                                      : getItemPrice({
                                          product: row.product,
                                          quantity: row.quantity,
                                          returnedBottle: row.returnedBottle,
                                        })
                                    ).toFixed(2)}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {row.product ? `R$ ${calculateRowTotal(row).toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {row.product && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => duplicateRow(row.id)}
                                  title="Duplicar"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              )}
                              {rows.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => removeRow(row.id)}
                                  title="Remover"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        ))}
                      {/* Linha de totais */}
                      {rows.some(r => r.product) && (
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={2} className="font-bold">
                            TOTAIS
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {totalQuantity}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right font-bold">
                            R$ {totalAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Rodapé com botão de finalizar */}
            <div className="mt-4 space-y-2">
              {lowStockProducts.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Alguns produtos têm estoque baixo</span>
                </div>
              )}
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={rows.filter((r) => r.product).length === 0}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Finalizar Venda (Ctrl+Enter)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes da Venda */}
      <Dialog open={showOrderModal} onOpenChange={(open) => {
        setShowOrderModal(open);
        if (!open) {
          setEditingOrderDate(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Venda #{selectedOrder?.order.id}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos da venda
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Cliente:</span>{" "}
                  {selectedOrder.order.customer_name || (
                    <span className="text-muted-foreground">Consumidor Final</span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Data:</span>
                  {editingOrderDate?.orderId === selectedOrder.order.id && user?.role === 'admin' ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="datetime-local"
                        defaultValue={new Date(selectedOrder.order.created_at).toISOString().slice(0, 16)}
                        onBlur={(e) => {
                          if (e.target.value) {
                            handleUpdateOrderDate(selectedOrder.order.id, e.target.value);
                          } else {
                            setEditingOrderDate(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const target = e.target as HTMLInputElement;
                            if (target.value) {
                              handleUpdateOrderDate(selectedOrder.order.id, target.value);
                            }
                          } else if (e.key === "Escape") {
                            setEditingOrderDate(null);
                          }
                        }}
                        className="w-48 h-8"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingOrderDate(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <span
                      className={user?.role === 'admin' ? "cursor-pointer hover:bg-accent p-1 rounded" : ""}
                      onClick={() => {
                        if (user?.role === 'admin') {
                          setEditingOrderDate({ orderId: selectedOrder.order.id, date: selectedOrder.order.created_at });
                        }
                      }}
                      title={user?.role === 'admin' ? "Clique para editar a data" : ""}
                    >
                      {new Date(selectedOrder.order.created_at).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Itens da Venda:</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.product_name}{" "}
                          {item.returned_bottle && (
                            <Badge variant="secondary" className="ml-2">
                              com casco
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>R$ {item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {(item.quantity * item.unit_price).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-right border-t pt-4">
                <p className="text-xl font-bold">
                  Total: R$ {selectedOrder.order.total.toFixed(2)}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOrderModal(false)}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => handleGenerateReceipt(selectedOrder.order.id)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Recibo
                </Button>
                {user?.role === 'admin' && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      showConfirm(
                        "Confirmar Exclusão",
                        "Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.",
                        async () => {
                          try {
                            await ordersApi.delete(selectedOrder.order.id);
                            setShowOrderModal(false);
                            await loadRecentOrders();
                            showAlert("Sucesso", "Venda excluída com sucesso!", "success");
                          } catch (error) {
                            showAlert("Erro", "Erro ao excluir venda: " + error, "error");
                          }
                        }
                      );
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Venda
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Alerta/Confirmação */}
      <AlertDialog open={alertDialog.open} onOpenChange={(open: boolean) => setAlertDialog({ ...alertDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {alertDialog.type === "error" && <AlertTriangle className="w-5 h-5 text-destructive" />}
              {alertDialog.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {alertDialog.type === "info" && <AlertTriangle className="w-5 h-5 text-blue-600" />}
              {alertDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertDialog.type === "confirm" ? (
              <>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (alertDialog.onConfirm) {
                      alertDialog.onConfirm();
                    }
                    setAlertDialog({ ...alertDialog, open: false });
                  }}
                >
                  Confirmar
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={() => setAlertDialog({ ...alertDialog, open: false })}>
                OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
