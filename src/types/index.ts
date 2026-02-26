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

export type CowStatus = 'wet' | 'dry' | 'bred' | 'bull' | 'steer' | 'cull';

export interface Pasture {
  id: string;
  name: string;
  createdAt: string;
}

export interface Cow {
  id: string;
  name?: string;           // optional nickname
  description?: string;    // free-text description/notes
  tags: Tag[];             // multiple tags referencing the same cow
  status: CowStatus;
  breed?: string;
  birthMonth?: number;     // 1-12
  birthYear?: number;      // e.g. 2024
  pastureId?: string;      // assigned pasture
  photos?: string[];       // array of local URIs
  motherTag?: string;      // tag number of mother cow
  notes: CowNote[];
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;       // null = needs sync
}
