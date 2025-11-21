import { useEffect, useState } from "react";
import { useProductsStore } from "../state/productsStore";
import { stockApi } from "../api/stock";
import type { StockMovementWithProduct } from "../types";
import { Plus, Minus, Edit } from "lucide-react";

export default function Stock() {
  const { products, fetchProducts } = useProductsStore();
  const [movements, setMovements] = useState<StockMovementWithProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(0);

  useEffect(() => {
    fetchProducts();
    loadMovements();
  }, [fetchProducts]);

  const loadMovements = async () => {
    try {
      const data = await stockApi.getMovements();
      setMovements(data);
    } catch (error) {
      alert("Erro ao carregar movimentações: " + error);
    }
  };

  const handleMovement = async () => {
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
      setShowModal(false);
      setSelectedProduct(null);
      setQuantity(0);
    } catch (error) {
      alert("Erro ao realizar movimentação: " + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Movimentação de Estoque
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nova Movimentação
        </button>
      </div>

      {/* Estoque Atual */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Estoque Atual</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Produto</th>
                <th className="text-left p-2">Estoque Cheio</th>
                <th className="text-left p-2">Estoque Vazio</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="p-2">{product.name}</td>
                  <td className="p-2 font-semibold">{product.stock_full}</td>
                  <td className="p-2">{product.stock_empty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico de Movimentações */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">
          Histórico de Movimentações
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Data</th>
                <th className="text-left p-2">Produto</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-left p-2">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-b">
                  <td className="p-2">
                    {new Date(movement.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-2">{movement.product_name}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        movement.movement_type === "IN"
                          ? "bg-green-100 text-green-800"
                          : movement.movement_type === "OUT"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {movement.movement_type === "IN"
                        ? "ENTRADA"
                        : movement.movement_type === "OUT"
                        ? "SAÍDA"
                        : "AJUSTE"}
                    </span>
                  </td>
                  <td className="p-2 font-semibold">
                    {movement.movement_type === "OUT" ? "-" : "+"}
                    {movement.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Movimentação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Nova Movimentação</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={movementType}
                  onChange={(e) =>
                    setMovementType(e.target.value as "IN" | "OUT" | "ADJUST")
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="IN">Entrada</option>
                  <option value="OUT">Saída</option>
                  <option value="ADJUST">Ajuste</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Produto
                </label>
                <select
                  value={selectedProduct || ""}
                  onChange={(e) =>
                    setSelectedProduct(parseInt(e.target.value) || null)
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(parseInt(e.target.value) || 0)
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {movementType === "ADJUST"
                    ? "Use valores negativos para reduzir o estoque"
                    : ""}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedProduct(null);
                    setQuantity(0);
                  }}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMovement}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? "Processando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

