// RanchBook - Core Types

export interface Tag {
  id: string;
  label: string;    // e.g. "ear tag", "RFID", "brand"
  number: string;    // the tag value
}

export interface CowNote {
  id: string;
  text: string;
  createdAt: string; // ISO date
}

export type CowStatus = 'wet' | 'dry' | 'bred' | 'open' | 'calf' | 'bull' | 'steer';

export interface Cow {
  id: string;
  name?: string;           // optional nickname
  tags: Tag[];             // multiple tags referencing the same cow
  status: CowStatus;
  breed?: string;
  birthDate?: string;
  notes: CowNote[];
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;       // null = needs sync
}
