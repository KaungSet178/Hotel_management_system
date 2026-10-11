import { AppError, ErrorCodes } from '../errors';
import { mockDb } from '@/mock/store';
import { DESTINATIONS, FEATURED_ROOM_IDS, HOTELS, ratePlansForRoom } from '@/mock/seed';
import { computeAvailability } from './availability';
import type { HotelService, RoomListing } from '../types';
import type { AddOn, Destination, Hotel, Room, ServiceResult, StayRange } from '@/types';
import { ADD_ONS } from '@/mock/seed';

const SIMULATED = { source: 'mock' as const, simulated: true };

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function result<T>(data: T): ServiceResult<T> {
  return { data, meta: SIMULATED };
}

function listing(room: Room, stay: StayRange | null): RoomListing {
  const hotel = HOTELS.find((h) => h.id === room.hotelId);
  if (!hotel) throw new AppError('Hotel not found for room', ErrorCodes.NOT_FOUND, 404);
  const ratePlanMap = ratePlansForRoom(room);
  const ratePlans = Object.values(ratePlanMap);
  const fromNightly = Math.min(...ratePlans.map((plan) => plan.nightlyRate));
  const availability = stay
    ? computeAvailability(room, stay, mockDb.get().bookings)
    : { available: true, roomsLeft: room.inventory };
  return { room, hotel, ratePlans, fromNightly, availability };
}

function roomsWithBlockouts(): Room[] {
  return mockDb.rooms();
}

export const mockHotelService: HotelService = {
  async getDestinations(): Promise<ServiceResult<Destination[]>> {
    return delay(result(DESTINATIONS), 120);
  },

  async getFeaturedRooms(limit = 3): Promise<ServiceResult<RoomListing[]>> {
    const rooms = roomsWithBlockouts();
    const listings = FEATURED_ROOM_IDS.map((id) => rooms.find((r) => r.id === id))
      .filter((room): room is Room => Boolean(room))
      .slice(0, limit)
      .map((room) => listing(room, null));
    return delay(result(listings), 200);
  },

  async searchRooms({ destination, stay, adults, rooms }): Promise<ServiceResult<RoomListing[]>> {
    const dest = DESTINATIONS.find((d) => d.id === destination);
    const hotelIds = dest ? dest.hotelIds : HOTELS.map((h) => h.id);
    const candidates = roomsWithBlockouts().filter((room) => hotelIds.includes(room.hotelId));
    const listings = candidates
      .filter((room) => room.maxGuests >= 1)
      .map((room) => listing(room, stay))
      .sort((a, b) => {
        if (a.availability.available !== b.availability.available) {
          return a.availability.available ? -1 : 1;
        }
        return b.room.rating - a.room.rating;
      });
    void adults;
    void rooms;
    return delay(result(listings), 320);
  },

  async getHotel(hotelId: string): Promise<ServiceResult<Hotel>> {
    const hotel = HOTELS.find((h) => h.id === hotelId);
    if (!hotel) throw new AppError('Hotel not found', ErrorCodes.NOT_FOUND, 404);
    return delay(result(hotel));
  },

  async listHotelRooms({ hotelId, stay }): Promise<ServiceResult<RoomListing[]>> {
    const listings = roomsWithBlockouts()
      .filter((room) => room.hotelId === hotelId)
      .map((room) => listing(room, stay))
      .sort((a, b) => {
        if (a.availability.available !== b.availability.available) {
          return a.availability.available ? -1 : 1;
        }
        return a.fromNightly - b.fromNightly;
      });
    return delay(result(listings), 260);
  },

  async getRoom(roomId: string): Promise<ServiceResult<RoomListing>> {
    const room = roomsWithBlockouts().find((r) => r.id === roomId);
    if (!room) throw new AppError('Room not found', ErrorCodes.NOT_FOUND, 404);
    return delay(result(listing(room, null)));
  },

  async getAddOns(): Promise<ServiceResult<AddOn[]>> {
    return delay(result(ADD_ONS), 120);
  },

  async checkAvailability(roomId: string, stay: StayRange) {
    const room = roomsWithBlockouts().find((r) => r.id === roomId);
    if (!room) throw new AppError('Room not found', ErrorCodes.NOT_FOUND, 404);
    return delay(result(computeAvailability(room, stay, mockDb.get().bookings)), 160);
  },
};