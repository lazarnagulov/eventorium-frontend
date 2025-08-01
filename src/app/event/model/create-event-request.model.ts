import { EventType } from "../../event-type/model/event-type.model";
import { City } from "../../shared/model/city.model";
import { Privacy } from "./privacy.enum";

export interface CreateEventRequestDto {
    name: string;
    description: string;
    date: Date;
    privacy: Privacy;
    maxParticipants: number;
    eventType: EventType | null;
    city: City;
    address: string;
}