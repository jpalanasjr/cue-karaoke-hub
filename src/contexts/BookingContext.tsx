import { createContext, useContext, useState, ReactNode } from "react";

export interface BookingItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Booking {
  id: string;
  type: "table" | "ktv" | "vip";
  number?: number;
  startTime: Date;
  customerName: string;
  items: BookingItem[];
  isOpenTime: boolean;
  plannedMinutes?: number;
  vipMode?: "full" | "karaoke" | "billiards";
}

interface RateConfig {
  table: number;
  ktv: number;
  vip: number;
}

interface BookingContextType {
  bookings: Booking[];
  rates: RateConfig;
  addBooking: (booking: Omit<Booking, "id" | "items">) => string;
  endBooking: (bookingId: string) => void;
  addItemToBooking: (bookingId: string, item: BookingItem) => void;
  updateRates: (rates: RateConfig) => void;
  getBookingByTypeAndNumber: (type: string, number?: number) => Booking | undefined;
  transferBooking: (bookingId: string, newType: string, newNumber?: number) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rates, setRates] = useState<RateConfig>({
    table: 10,
    ktv: 20,
    vip: 30,
  });

  const addBooking = (booking: Omit<Booking, "id" | "items">) => {
    const id = `${booking.type}-${booking.number || "vip"}-${Date.now()}`;
    const newBooking: Booking = {
      ...booking,
      id,
      items: [],
      isOpenTime: booking.isOpenTime ?? true,
      plannedMinutes: booking.plannedMinutes,
    };
    setBookings((prev) => [...prev, newBooking]);
    return id;
  };

  const endBooking = (bookingId: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const addItemToBooking = (bookingId: string, item: BookingItem) => {
    setBookings((prev) =>
      prev.map((booking) => {
        if (booking.id === bookingId) {
          const existingItem = booking.items.find((i) => i.id === item.id);
          if (existingItem) {
            return {
              ...booking,
              items: booking.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return {
            ...booking,
            items: [...booking.items, item],
          };
        }
        return booking;
      })
    );
  };

  const updateRates = (newRates: RateConfig) => {
    setRates(newRates);
  };

  const getBookingByTypeAndNumber = (type: string, number?: number) => {
    return bookings.find((b) => b.type === type && (type === "vip" || b.number === number));
  };

  const transferBooking = (bookingId: string, newType: string, newNumber?: number) => {
    setBookings((prev) =>
      prev.map((booking) => {
        if (booking.id === bookingId) {
          return {
            ...booking,
            type: newType as "table" | "ktv" | "vip",
            number: newNumber,
            id: `${newType}-${newNumber || "vip"}-${Date.now()}`,
          };
        }
        return booking;
      })
    );
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        rates,
        addBooking,
        endBooking,
        addItemToBooking,
        updateRates,
        getBookingByTypeAndNumber,
        transferBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within BookingProvider");
  }
  return context;
}
