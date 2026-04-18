# Uhambo East Africa — Product Requirements Document

---

## Table of Contents

1. [Homepage](#1-homepage)
2. [Plan Trip Page](#2-plan-trip-page-multi-step-wizard)
3. [Results Page](#3-results-page)
4. [Transport Page](#4-transport-page)
5. [Destinations Page](#5-destinations-page)
6. [Experiences Page](#6-experiences-page)
7. [About Page](#7-about-page)
8. [Contact Page](#8-contact-page)
9. [Admin Dashboard](#9-admin-dashboard)
10. [Global Features](#10-global-features)

---

## 1. Homepage

### Goal

- Inspire the user
- Direct users into 3 main flows: **Plan Trip**, **Transport**, **Advice**

---

### Modules Checklist

#### Navbar

- [ ] Logo (left-aligned)
- [ ] Navigation links: Home, Plan Trip, Transport, Destinations, Experiences, About, Contact
- [ ] Theme toggle (light/dark icon)
- [ ] Sticky on scroll
- [ ] Mobile hamburger menu

#### Hero Section

- [ ] Background video (East Africa landscapes)
- [ ] Gradient overlay
- [ ] Headline: _"Explore East Africa, Your Way"_
- [ ] Supporting subtext
- [ ] CTA buttons:
  - [ ] Plan My Trip
  - [ ] Book Transport
  - [ ] Get Advice
- [ ] Mobile: optimized static fallback image

#### Countries Section

- [ ] Cards for: Kenya, Tanzania, Uganda, Rwanda
- [ ] Each card includes:
  - [ ] Country image
  - [ ] Country name
  - [ ] Click → Destinations page (filtered by country)

#### Services Section

- [ ] 3 service cards:
  - [ ] Transport Services
  - [ ] Accommodation Booking
  - [ ] Trip Planning
- [ ] Each card includes:
  - [ ] Icon or image
  - [ ] Short description
  - [ ] CTA link

#### Featured Experiences

- [ ] Cards for: Safari, Beach, City Tours, Culture
- [ ] Hover effect on cards
- [ ] Click → Experiences page

#### Popular Destinations

- [ ] Grid layout
- [ ] Each card includes:
  - [ ] Image
  - [ ] Destination name
  - [ ] Short description
  - [ ] CTA button

#### Testimonials

- [ ] Card-based layout
- [ ] Name + review text per card
- [ ] Optional star rating

#### FAQ Section

- [ ] Accordion component
- [ ] Expand/collapse animation

#### Footer

- [ ] Social icons: Instagram, TikTok, Facebook
- [ ] Contact info: phone, email
- [ ] Navigation links
- [ ] Copyright notice

---

## 2. Plan Trip Page (Multi-Step Wizard)

### Goal

Collect structured inputs from the user and generate tailored recommendations.

---

### Modules Checklist

#### Step Wizard Container

- [ ] Progress bar (Step X of Y)
- [ ] Smooth step transitions
- [ ] One question per view

#### Step 1 — Destination

- [ ] Question prompt text
- [ ] 4 selectable destination cards
- [ ] Highlight selected option

#### Step 2 — Dates

- [ ] Date range picker
- [ ] Validation:
  - [ ] Start date must be before end date
  - [ ] No past dates allowed

#### Step 3 — Travel Group

- [ ] Options: Solo, Couple, Family, Group
- [ ] Conditional: input field for number of people

#### Step 4 — Service Type

- [ ] Options:
  - [ ] Accommodation only
  - [ ] Transport only
  - [ ] Both

#### Step 5A — Accommodation _(Conditional)_

- [ ] Destination selector (region / city)
- [ ] Room type selection: Single, Twin, Double, Triple

#### Step 5B — Transport _(Conditional)_

- [ ] Input: From location
- [ ] Input: To location
- [ ] Input: Number of days
- [ ] Vehicle selection:
  - [ ] 10-seater Van
  - [ ] Alphard
  - [ ] 16-seater Van
  - [ ] Coaster
  - [ ] Truck
  - [ ] Noah
  - [ ] 4x4 Land Cruiser

#### Step 6 — Budget

- [ ] Currency selector: USD, KES, EUR
- [ ] Optional: budget range slider

#### Step 7 — Submit

- [ ] Button: _"Find My Trip"_

---

## 3. Results Page

### Goal

Display trip recommendations clearly and allow users to take action.

---

### Modules Checklist

#### Summary Panel

- [ ] Displays: Destination, Dates, Group size, Service type
- [ ] Edit button to go back and adjust inputs

#### Hotel Recommendations _(if applicable)_

- [ ] Card layout per hotel:
  - [ ] Image
  - [ ] Hotel name
  - [ ] Location
  - [ ] Price
  - [ ] Room type
  - [ ] CTA: Select / Request

#### Transport Recommendations _(if applicable)_

- [ ] Card layout per vehicle:
  - [ ] Vehicle type
  - [ ] Capacity
  - [ ] Price
  - [ ] "Best for" tag
  - [ ] CTA button

#### Pricing Summary

- [ ] Estimated total cost
- [ ] Currency display

#### Action Section

- [ ] Button: Request Booking
- [ ] Button: Contact Advisor

---

## 4. Transport Page

### Goal

Enable direct vehicle booking without going through the full trip wizard.

---

### Modules Checklist

#### Input Form

- [ ] From location
- [ ] To location
- [ ] Number of days
- [ ] Number of people
- [ ] Vehicle type dropdown

#### Results Section

- [ ] Vehicle cards
- [ ] Price display
- [ ] CTA button per card

---

## 5. Destinations Page

### Goal

Allow users to explore and filter destinations across East Africa.

---

### Modules Checklist

#### Filter Bar

- [ ] Country filter
- [ ] Search input

#### Destination Grid

- [ ] Cards with:
  - [ ] Image
  - [ ] Destination name
  - [ ] Short description
  - [ ] CTA button

---

## 6. Experiences Page

### Modules Checklist

#### Categories

- [ ] Safari
- [ ] Beach
- [ ] Culture
- [ ] City

#### Experience Cards

- [ ] Image
- [ ] Title
- [ ] Short description text
- [ ] CTA button

---

## 7. About Page

### Modules Checklist

#### Company Intro

- [ ] Mission statement
- [ ] Vision statement

#### Story Section

- [ ] Text content
- [ ] Supporting image

---

## 8. Contact Page

### Modules Checklist

#### Contact Form

- [ ] Name field
- [ ] Email field
- [ ] Phone field
- [ ] Message field

#### Contact Info

- [ ] Phone number
- [ ] Email address

#### CTA

- [ ] Submit button

---

## 9. Admin Dashboard

### Modules Checklist

#### Sidebar Navigation

- [ ] Home
- [ ] Bookings
- [ ] Hotels
- [ ] Transport
- [ ] Settings

---

### 9.1 Home

- [ ] Metric cards:
  - [ ] Total bookings
  - [ ] Revenue
  - [ ] Active trips
  - [ ] Conversion rate

---

### 9.2 Bookings

- [ ] Table columns: Booking ID, Name, Phone, Email, Type, Destination, Dates, Status
- [ ] Filters:
  - [ ] Filter by Status
  - [ ] Filter by Date

---

### 9.3 Hotels

- [ ] Table columns: Hotel name, Country, Region, Price
- [ ] Actions:
  - [ ] Add
  - [ ] Edit
  - [ ] Delete

---

### 9.4 Transport

- [ ] Table columns: Vehicle, Capacity, Price, Region, Best For
- [ ] Actions:
  - [ ] Add
  - [ ] Edit
  - [ ] Delete

---

## 10. Global Features

### Modules Checklist

#### Theme System

- [ ] Light mode
- [ ] Dark mode

#### Responsiveness

- [ ] Mobile-first design
- [ ] Tablet compatibility
- [ ] Desktop layout

#### Performance

- [ ] Lazy load images
- [ ] Optimized video loading
- [ ] Fast page load targets
