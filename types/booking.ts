export type TravellingWith = "solo" | "couple" | "family" | "group";

export type BookingType = "accommodation" | "transport" | "both";

export type BookingStatus =
    | "new"
    | "contacted"
    | "quoted"
    | "confirmed"
    | "cancelled"
    | "completed";

export type FirestoreTimestamp = {
    _seconds: number;
    _nanoseconds: number;
};

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

    minimumBudget: number;
    maximumBudget: number;

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

    minimumBudget: number;
    maximumBudget: number;
};
