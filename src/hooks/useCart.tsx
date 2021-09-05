import { useEffect } from 'react';
import { useRef } from 'react';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    return storagedCart ? JSON.parse(storagedCart) : [];
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(()=> {
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(()=> {
    if(cartPreviousValue !== cart){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  },[cartPreviousValue,cart])

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart]
      const productExist = newCart.find(product => product.id === productId)

      const stock = await api.get<Stock>(`/stock/${productId}`)

      const stockAmount = stock.data.amount
      const currentAmount = productExist ? productExist.amount : 0
      const amount = currentAmount + 1

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (productExist) {
        productExist.amount = amount

      } else {
        const { data: product } = await api.get(`/products/${productId}`)
        newCart.push({
          ...product, amount
        })
      }

      setCart(newCart)
    } catch (error) {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart]

      const productIndex = newCart.findIndex(({ id }) => id === productId)

      if (productIndex >= 0) {
        newCart.splice(productIndex, 1)
        setCart(newCart)
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const stock = await api.get<Stock>(`/stock/${productId}`)
      const stockAmount = stock.data.amount

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const newCart = [...cart]
      const productExist = newCart.find(product => product.id === productId)

      if (productExist) {
        productExist.amount = amount
        setCart(newCart)
      } else {
        throw Error()
      }
    } catch (error) {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };


  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
