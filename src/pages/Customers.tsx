import { useEffect, useState } from "react";
import { useCustomersStore } from "../state/customersStore";
import { useAuthStore } from "@/state/authStore";
import { customersApi } from "../api/customers";
import { ordersApi } from "../api/orders";
import type { Customer, CreateCustomerPayload, OrderWithCustomer } from "../types";
import { Plus, Edit, Trash2, Search, History } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Customers() {
  const { customers, loading, fetchCustomers, removeCustomer } =
    useCustomersStore();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderWithCustomer[]>([]);
  const [formData, setFormData] = useState<CreateCustomerPayload>({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, formData);
        await fetchCustomers();
      } else {
        await customersApi.create(formData);
        await fetchCustomers();
      }
      setShowModal(false);
      setEditingCustomer(null);
      setFormData({ name: "", phone: "", address: "", notes: "" });
    } catch (error) {
      alert("Erro ao salvar cliente: " + error);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      try {
        await customersApi.delete(id);
        removeCustomer(id);
      } catch (error) {
        alert("Erro ao excluir cliente: " + error);
      }
    }
  };

  const handleSearch = async () => {
    if (searchPhone.trim()) {
      try {
        const results = await customersApi.searchByPhone(searchPhone);
        // Atualizar lista com resultados
        // Por simplicidade, vamos apenas filtrar localmente
      } catch (error) {
        console.error("Erro na busca:", error);
      }
    }
  };

  const handleViewHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const orders = await ordersApi.getByCustomer(customer.id);
      setCustomerOrders(orders);
    } catch (error) {
      alert("Erro ao carregar histórico: " + error);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    searchPhone.trim()
      ? c.phone?.toLowerCase().includes(searchPhone.toLowerCase())
      : true
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e histórico de compras
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCustomer(null);
            setFormData({ name: "", phone: "", address: "", notes: "" });
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Buscar por telefone..."
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Todos os clientes cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone || "-"}</TableCell>
                  <TableCell>{customer.address || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewHistory(customer)}
                        title="Ver histórico"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(customer)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {user?.role === 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(customer.id)}
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
        </CardContent>
      </Card>

      {/* Dialog de Cliente */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Atualize as informações do cliente"
                : "Adicione um novo cliente ao sistema"}
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
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="text"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Textarea
                id="address"
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingCustomer(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => {
        if (!open) {
          setSelectedCustomer(null);
          setCustomerOrders([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Histórico - {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              Histórico de compras do cliente
            </DialogDescription>
          </DialogHeader>
          {customerOrders.length === 0 ? (
            <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
          ) : (
            <div className="overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {order.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

