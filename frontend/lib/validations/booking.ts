import { z } from "zod";

export const createBookingSchema = z
    .object({
        fullName: z.string().min(2, "Full name is required"),
        email: z.string().email("Valid email is required"),
        phone: z.string().min(7, "Phone number is required"),

        destination: z.string().min(2, "Destination is required"),

        travelStartDate: z.string().min(1, "Travel start date is required"),
        travelEndDate: z.string().min(1, "Travel end date is required"),

        travellingWith: z.enum(["solo", "couple", "family", "group"]),
        bookingType: z.enum(["accommodation", "transport", "both"]),

        numberOfTravellers: z.coerce.number().int().min(1),
        numberOfRooms: z.coerce.number().int().min(0),

        minimumBudget: z.coerce.number().min(0),
        maximumBudget: z.coerce.number().min(0),
        transportFrom: z.string().min(2).optional(),
        transportTo: z.string().min(2).optional(),
        transportDays: z.coerce.number().int().min(1).optional(),
        vehicleType: z.string().min(2).optional(),
    })
    .refine((data) => data.maximumBudget >= data.minimumBudget, {
        message: "Maximum budget must be greater than or equal to minimum budget",
        path: ["maximumBudget"],
    })
    .refine(
        (data) => new Date(data.travelEndDate) >= new Date(data.travelStartDate),
        {
            message: "Travel end date must be after or equal to travel start date",
            path: ["travelEndDate"],
        }
    )
    .refine(
        (data) =>
            data.bookingType === "accommodation" ||
            Boolean(
                data.transportFrom &&
                data.transportTo &&
                data.transportDays &&
                data.vehicleType
            ),
        {
            message: "Transport route, days, and vehicle are required",
            path: ["vehicleType"],
        }
    );

export const updateBookingStatusSchema = z.object({
    status: z.enum([
        "new",
        "contacted",
        "quoted",
        "confirmed",
        "cancelled",
        "completed",
    ]),
});
