// FILE: src/components/BookerDashboardTabs.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookingCard, Booking } from "./BookingCard";
import { EventRequestCard, EventRequest } from "./EventRequestCard";
import { useRealtimeBookings } from "@/hooks/useRealtimeBookings";
import { useRealtimeEventRequests } from "@/hooks/useRealtimeEventRequests";
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10; // We will load 10 items at a time

export const BookerDashboardTabs = ({ userId }: { userId: string }) => {
    const [directBookings, setDirectBookings] = useState<Booking[]>([]);
    const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMoreBookings, setLoadingMoreBookings] = useState(false);
    const [loadingMoreRequests, setLoadingMoreRequests] = useState(false);
    const [hasMoreBookings, setHasMoreBookings] = useState(true);
    const [hasMoreRequests, setHasMoreRequests] = useState(true);
    const [bookingsPage, setBookingsPage] = useState(0);
    const [requestsPage, setRequestsPage] = useState(0);
    const isNativeApp = Capacitor.isNativePlatform();

    const fetchInitialData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        // CHROME CACHE BUST: Add timestamp to force fresh data in Chrome
        const timestamp = Date.now();
        console.log('Fetching initial bookings for user:', userId, 'at timestamp:', timestamp);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const bookingsQuery = supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`)
            .eq('user_id', userId)
            .order('event_date', { ascending: true })
            .range(0, PAGE_SIZE - 1);

        const requestsQuery = supabase
            .from('event_requests')
            .select('*')
            .eq('user_id', userId)
            .gte('event_date', today.toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .range(0, PAGE_SIZE - 1);

        // Run queries in parallel for efficiency
        const [bookingsResult, requestsResult] = await Promise.all([bookingsQuery, requestsQuery]);

        if (bookingsResult.error) console.error("Error fetching bookings:", bookingsResult.error.message);
        else {
            console.log('Fetched bookings:', bookingsResult.data?.length || 0, 'records');
            console.log('Booking statuses found:', bookingsResult.data?.map(b => `${b.id}: ${b.status}`));
            setDirectBookings(bookingsResult.data as Booking[] || []);
            setHasMoreBookings(bookingsResult.data.length === PAGE_SIZE);
            setBookingsPage(1);
        }

        if (requestsResult.error) console.error("Error fetching requests:", requestsResult.error.message);
        else {
            console.log('Fetched event requests:', requestsResult.data?.length || 0, 'records');
            console.log('Event request statuses found:', requestsResult.data?.map(r => `${r.id}: ${r.status}`));
            setEventRequests(requestsResult.data as EventRequest[] || []);
            setHasMoreRequests(requestsResult.data.length === PAGE_SIZE);
            setRequestsPage(1);
        }

        setLoading(false);
    }, [userId]);

    // Enhanced removal handlers with logging
    const handleBookingRemove = useCallback((bookingId: string) => {
        console.log('Removing booking from booker dashboard:', bookingId);
        setDirectBookings(prev => {
            const filtered = prev.filter(booking => booking.id !== bookingId);
            console.log('Bookings after removal:', filtered.length);
            return filtered;
        });
    }, []);

    const handleEventRequestRemove = useCallback((requestId: string) => {
        console.log('Removing event request from booker dashboard:', requestId);
        setEventRequests(prev => {
            const filtered = prev.filter(r => r.id !== requestId);
            console.log('Event requests after removal:', filtered.length);
            return filtered;
        });
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Enable realtime updates for bookings and event requests
    useRealtimeBookings(fetchInitialData);
    useRealtimeEventRequests(fetchInitialData);

    // Auto-scroll to show all cards after data loads and on tab change (especially for native apps)
    const tabsContainerRef = React.useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = React.useState("direct_bookings");
    
    const scrollToShowAllCards = React.useCallback(() => {
        // More powerful scroll: scroll to bottom of page to show all content
        const scrollToBottom = () => {
            const scrollContainer = document.documentElement || document.body;
            const scrollHeight = scrollContainer.scrollHeight;
            const clientHeight = scrollContainer.clientHeight;
            
            // Only scroll if content extends beyond viewport
            if (scrollHeight > clientHeight) {
                window.scrollTo({
                    top: scrollHeight - clientHeight,
                    behavior: 'smooth'
                });
            }
        };

        // Wait a bit for layout to settle, then scroll to bottom
        const timer = setTimeout(() => {
            scrollToBottom();
            // Also try scrolling the current tab content
            if (tabsContainerRef.current) {
                const currentTab = tabsContainerRef.current.querySelector('[role="tabpanel"][data-state="active"]') || 
                                   tabsContainerRef.current.querySelector('[role="tabpanel"]');
                if (currentTab) {
                    const cards = currentTab.querySelectorAll('div[class*="rounded"], [class*="Card"], [class*="card"]');
                    if (cards.length > 0) {
                        const lastCard = cards[cards.length - 1] as HTMLElement;
                        if (lastCard) {
                            // Ensure last card is visible by scrolling it into view as well
                            lastCard.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'end',
                                inline: 'nearest'
                            });
                        }
                    }
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, []);

    // Auto-scroll when data loads
    useEffect(() => {
        if (!loading && (directBookings.length > 0 || eventRequests.length > 0)) {
            // Wait for cards to render, then scroll smoothly to show all cards
            const timer = setTimeout(() => {
                scrollToShowAllCards();
            }, 500); // Wait 500ms for cards to fully render

            return () => clearTimeout(timer);
        }
    }, [loading, directBookings.length, eventRequests.length, scrollToShowAllCards]);

    // Auto-scroll when tab changes
    useEffect(() => {
        if (!loading && (directBookings.length > 0 || eventRequests.length > 0)) {
            const timer = setTimeout(() => {
                scrollToShowAllCards();
            }, 300); // Wait 300ms for tab transition to complete

            return () => clearTimeout(timer);
        }
    }, [activeTab, loading, scrollToShowAllCards]);

    const loadMoreBookings = async () => {
        if (!userId || loadingMoreBookings) return;
        setLoadingMoreBookings(true);
        const from = bookingsPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
            .from('bookings')
            .select(`*, talent_profiles(artist_name)`)
            .eq('user_id', userId)
            .order('event_date', { ascending: true })
            .range(from, to);
        
        if (error) console.error("Error fetching more bookings:", error.message);
        else if (data) {
            setDirectBookings(prev => [...prev, ...data as Booking[]]);
            setHasMoreBookings(data.length === PAGE_SIZE);
            setBookingsPage(prev => prev + 1);
        }
        setLoadingMoreBookings(false);
    };
    
    const loadMoreRequests = async () => {
        if (!userId || loadingMoreRequests) return;
        setLoadingMoreRequests(true);
        const from = requestsPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('event_requests')
            .select('*')
            .eq('user_id', userId)
            .gte('event_date', today.toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) console.error("Error fetching more requests:", error.message);
        else if (data) {
            setEventRequests(prev => [...prev, ...data as EventRequest[]]);
            setHasMoreRequests(data.length === PAGE_SIZE);
            setRequestsPage(prev => prev + 1);
        }
        setLoadingMoreRequests(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="w-full" ref={tabsContainerRef}>
            <Tabs defaultValue="direct_bookings" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="direct_bookings">
                        Direct Bookings ({directBookings.length})
                    </TabsTrigger>
                    <TabsTrigger value="event_requests">
                        Event Requests ({eventRequests.length})
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="direct_bookings" className={cn(isNativeApp ? "pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))]" : "pt-4")}>
                    <div className={cn(isNativeApp ? "space-y-3 w-full" : "space-y-4")}>
                        {directBookings.length > 0 ? (
                            directBookings.map(b => (
                                <div key={b.id} className={cn(isNativeApp && "w-full")}>
                                    <BookingCard 
                                        booking={b} 
                                        mode="booker" 
                                        onUpdate={fetchInitialData} 
                                        onRemove={handleBookingRemove} 
                                    />
                                </div>
                            ))
                        ) : (
                            <p className={cn("text-muted-foreground text-center", isNativeApp ? "text-sm py-6" : "py-8")}>You have not made any direct bookings.</p>
                        )}
                    </div>
                    {hasMoreBookings && (
                        <div className={cn("text-center", isNativeApp ? "mt-4" : "mt-6")}>
                            <Button 
                                onClick={loadMoreBookings} 
                                disabled={loadingMoreBookings}
                                className={cn(isNativeApp ? "h-9 text-sm" : "")}
                                size={isNativeApp ? "default" : "default"}
                            >
                                {loadingMoreBookings ? 'Loading...' : 'Load More'}
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="event_requests" className={cn(isNativeApp ? "pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))]" : "pt-4")}>
                    <div className={cn(isNativeApp ? "space-y-3 w-full" : "space-y-4")}>
                        {eventRequests.length > 0 ? (
                            eventRequests.map((req) => (
                                <div key={req.id} className={cn(isNativeApp && "w-full")}>
                                    <EventRequestCard 
                                        request={req} 
                                        isActionable={true} 
                                        mode="booker"
                                        onRemove={handleEventRequestRemove}
                                    />
                                </div>
                            ))
                        ) : (
                            <p className={cn("text-muted-foreground text-center", isNativeApp ? "text-sm py-6" : "py-8")}>You have not made any event requests to our team.</p>
                        )}
                    </div>
                    {hasMoreRequests && (
                        <div className={cn("text-center", isNativeApp ? "mt-4" : "mt-6")}>
                            <Button 
                                onClick={loadMoreRequests} 
                                disabled={loadingMoreRequests}
                                className={cn(isNativeApp ? "h-9 text-sm" : "")}
                                size={isNativeApp ? "default" : "default"}
                            >
                                {loadingMoreRequests ? 'Loading...' : 'Load More'}
                            </Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};