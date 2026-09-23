export type TravellingWith = "solo" | "couple" | "family" | "group";

export type BookingType = "accommodation" | "transport" | "both";

export type BookingStatus =
    | "new"
    | "contacted"
    | "quoted"
    | "confirmed"
    | "cancelled"
    | "completed";

export type FirestoreTimestamp =
    | { _seconds: number; _nanoseconds?: number }
    | { seconds: number; nanoseconds?: number }
    | string;

export type Booking = {
    id: string;

    fullName: string;
    email: string;
    phone: string;

    destination: string;

    travelStartDate: string;
    travelEndDate: string;

    travellingWith: TravellingWith;
    bookingType: BookingType;

    numberOfTravellers: number;
    numberOfRooms: number;

    selectedHotelId?: string | null;

    transportFrom?: string;
    transportTo?: string;
    transportDays?: number;
    vehicleType?: string;
    transportAmountKes?: number;
    paymentStatus?: "not_required" | "unpaid" | "pending" | "paid" | "failed";
    kcbReceiptNumber?: string;

    status: BookingStatus;

    createdAt: FirestoreTimestamp;
    updatedAt: FirestoreTimestamp;
};

export type CreateBookingInput = {
    fullName: string;
    email: string;
    phone: string;

    destination: string;

    travelStartDate: string;
    travelEndDate: string;

    travellingWith: TravellingWith;
    bookingType: BookingType;

    numberOfTravellers: number;
    numberOfRooms: number;

    selectedHotelId?: string;

    transportFrom?: string;
    transportTo?: string;
    transportDays?: number;
    vehicleType?: string;
};

export type CreateBookingResult = {
    success: true;
    message: string;
    id: string;
    payment: {
        required: boolean;
        amountKes: number | null;
    };
};
