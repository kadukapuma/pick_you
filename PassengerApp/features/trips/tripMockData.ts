import type { TripListItem } from "./tripTypes";

export const upcomingTrips: TripListItem[] = [
  {
    id: "PU-2049",
    status: "SCHEDULED",
    pickup: "Kandy Road, Kurunegala",
    dropoff: "Kurunegala Railway Station",
    date: "Today",
    time: "8:45 PM",
    distance: "4.2 km",
    duration: "12 min",
    vehicleLabel: "Mini car",
    paymentMethod: "Cash",
  },
];

export const completedTrips: TripListItem[] = [
  {
    id: "PU-2038",
    status: "COMPLETED",
    pickup: "Kandy Road, Kurunegala",
    dropoff: "Teaching Hospital Kurunegala",
    date: "Jul 12",
    time: "6:20 PM",
    fare: "Rs. 640",
    distance: "5.8 km",
    duration: "18 min",
    driverName: "Nimesh Bandara",
    vehicleLabel: "Toyota Aqua",
    vehicleNumber: "NW CAB 4587",
    paymentMethod: "Cash",
  },
  {
    id: "PU-2027",
    status: "COMPLETED",
    pickup: "Kurunegala Town",
    dropoff: "Mallawapitiya",
    date: "Jul 10",
    time: "9:10 AM",
    fare: "Rs. 520",
    distance: "4.6 km",
    duration: "14 min",
    driverName: "Kasun Perera",
    vehicleLabel: "Tuk",
    vehicleNumber: "NW AAA 2145",
    paymentMethod: "Cash",
  },
];

export const cancelledTrips: TripListItem[] = [
  {
    id: "PU-2019",
    status: "CANCELLED",
    pickup: "Kurunegala Bus Stand",
    dropoff: "Malkaduwawa",
    date: "Jul 09",
    time: "2:35 PM",
    distance: "3.9 km",
    duration: "11 min",
    issue: "Cancelled before driver arrived",
  },
];

export const complaintTrips: TripListItem[] = [
  {
    id: "PU-2004",
    status: "COMPLAINT",
    pickup: "Kandy Road, Kurunegala",
    dropoff: "Wariyapola Road",
    date: "Jul 05",
    time: "7:05 PM",
    fare: "Rs. 780",
    distance: "7.4 km",
    duration: "24 min",
    issue: "Fare review requested",
    driverName: "Driver assigned",
  },
];
