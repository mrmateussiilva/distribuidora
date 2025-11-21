import { ShoppingCart, Plus, Minus, X, ToggleLeft, ToggleRight } from "lucide-react";
import type { CartItem } from "../types";

interface CartProps {
  cart: CartItem[];
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  onRemoveItem: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onToggleReturnedBottle: (productId: number) => void;
  onCheckout: () => void;
  calculateItemPrice: (item: CartItem) => number;
  calculateTotal: () => number;
}

export default function Cart({
  cart,
  customerName,
  onCustomerNameChange,
  onRemoveItem,
  onUpdateQuantity,
  onToggleReturnedBottle,
  onCheckout,
  calculateItemPrice,
  calculateTotal,
}: CartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold">Carrinho</h2>
        </div>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="Nome do cliente"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Carrinho vazio</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => {
              const itemPrice = calculateItemPrice(item);
              const itemTotal = itemPrice * item.quantity;

              return (
                <div
                  key={item.product.id}
                  className="border border-gray-200 rounded-lg p-3 bg-white"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{item.product.name}</h3>
                      <p className="text-xs text-gray-600">
                        {formatCurrency(itemPrice)} cada
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Toggle Returned Bottle */}
                  <div className="mb-2">
                    <button
                      onClick={() => onToggleReturnedBottle(item.product.id)}
                      className={`flex items-center gap-2 text-xs px-2 py-1 rounded transition-colors ${
                        item.returnedBottle
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {item.returnedBottle ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                      <span>
                        {item.returnedBottle
                          ? "Trouxe o casco"
                          : "Não trouxe o casco"}
                      </span>
                    </button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-semibold w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(itemTotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with Total and Checkout */}
      {cart.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(calculateTotal())}
            </span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Finalizar Pedido
          </button>
        </div>
      )}
    </div>
  );
}

