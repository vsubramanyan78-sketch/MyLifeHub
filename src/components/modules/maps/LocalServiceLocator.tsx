import React, { useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Search,
  Navigation,
  Phone,
  Clock,
  Sparkles,
  Wrench,
  ShoppingBag,
  ExternalLink,
  Layers,
  RefreshCw,
} from 'lucide-react';

interface LocalServiceLocatorProps {
  defaultQuery?: string;
}

interface PlaceResult {
  id: string;
  name: string;
  category: 'Service Center' | 'Supermarket' | 'Automotive' | 'Electronics';
  address: string;
  rating: number;
  openNow: boolean;
  position: { lat: number; lng: number };
  phone?: string;
  website?: string;
}

// Baseline verified service hubs (default center: Bangalore / Tech Hub)
const SAMPLE_VERIFIED_PLACES: PlaceResult[] = [
  {
    id: 'p1',
    name: 'Samsung & LG Authorized Appliance Service Care',
    category: 'Service Center',
    address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038',
    rating: 4.8,
    openNow: true,
    position: { lat: 12.9716, lng: 77.6412 },
    phone: '+91 80 4123 9900',
  },
  {
    id: 'p2',
    name: 'Apple Authorized Service Provider (Imagine / Ample)',
    category: 'Electronics',
    address: 'Phoenix Marketcity, Whitefield Main Rd, Mahadevapura 560048',
    rating: 4.7,
    openNow: true,
    position: { lat: 12.9961, lng: 77.6963 },
    phone: '+91 80 6726 6611',
  },
  {
    id: 'p3',
    name: 'Hyundai Authorized Service Workshop (Advaith)',
    category: 'Automotive',
    address: 'Outer Ring Rd, Marathahalli, Bengaluru 560037',
    rating: 4.6,
    openNow: true,
    position: { lat: 12.9568, lng: 77.7011 },
    phone: '+91 80 4350 5000',
  },
  {
    id: 'p4',
    name: 'Nature’s Basket & Organic Harvest Supermarket',
    category: 'Supermarket',
    address: 'CMH Road, Indiranagar, Bengaluru 560038',
    rating: 4.9,
    openNow: true,
    position: { lat: 12.9784, lng: 77.6408 },
    phone: '+91 80 4115 1200',
  },
];

export const LocalServiceLocator: React.FC<LocalServiceLocatorProps> = ({ defaultQuery }) => {
  const [searchQuery, setSearchQuery] = useState(defaultQuery || '');
  const [places, setPlaces] = useState<PlaceResult[]>(SAMPLE_VERIFIED_PLACES);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [center, setCenter] = useState({ lat: 12.9716, lng: 77.6412 });
  const [isSearchingGrounded, setIsSearchingGrounded] = useState(false);
  const [groundedSummary, setGroundedSummary] = useState<string | null>(null);

  // Fallback demo maps key or configured env var
  const mapsApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  const handleSearchWithMapsGrounding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingGrounded(true);
    setGroundedSummary(null);

    try {
      const resp = await fetch('/api/gemini/maps-grounded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: { city: 'Bengaluru', lat: center.lat, lng: center.lng },
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.answer) {
          setGroundedSummary(data.answer);
        }
      }
    } catch (err) {
      console.warn('Maps grounding lookup error:', err);
    } finally {
      setIsSearchingGrounded(false);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>Local Service Centers & Grocery Finder</span>
          </h3>
          <p className="text-xs text-slate-400">
            Powered by Google Maps Platform & Maps Grounding to find verified repair technicians and supermarkets.
          </p>
        </div>

        <form onSubmit={handleSearchWithMapsGrounding} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. Authorized LG Service Center, Organic Mart"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none w-64 md:w-80"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingGrounded}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all shrink-0"
          >
            {isSearchingGrounded ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Search Nearby</span>
          </button>
        </form>
      </div>

      {/* Maps Grounding Summary AI Callout */}
      {groundedSummary && (
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-700 dark:text-indigo-200 flex items-start space-x-2.5">
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="flex-1 whitespace-pre-line leading-relaxed">{groundedSummary}</div>
        </div>
      )}

      {/* Main Map & Places List Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[420px]">
        {/* Google Map Viewport */}
        <div className="lg:col-span-2 h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-slate-950">
          <APIProvider apiKey={mapsApiKey || 'AIzaSyDemoPlaceholder'}>
            <Map
              defaultCenter={center}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI={false}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {places.map((place) => (
                <AdvancedMarker
                  key={place.id}
                  position={place.position}
                  onClick={() => setSelectedPlace(place)}
                >
                  <Pin
                    background={
                      place.category === 'Service Center'
                        ? '#3b82f6'
                        : place.category === 'Automotive'
                        ? '#dc2626'
                        : place.category === 'Supermarket'
                        ? '#10b981'
                        : '#8b5cf6'
                    }
                    borderColor="#ffffff"
                    glyphColor="#ffffff"
                  />
                </AdvancedMarker>
              ))}

              {selectedPlace && (
                <InfoWindow
                  position={selectedPlace.position}
                  onCloseClick={() => setSelectedPlace(null)}
                >
                  <div className="p-1 text-slate-900 text-xs max-w-xs">
                    <h4 className="font-bold">{selectedPlace.name}</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">{selectedPlace.address}</p>
                    {selectedPlace.phone && (
                      <p className="text-[10px] text-blue-600 mt-1 font-semibold">
                        {selectedPlace.phone}
                      </p>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </div>

        {/* Places Card List */}
        <div className="overflow-y-auto space-y-2.5 pr-1">
          {places.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setSelectedPlace(p);
                setCenter(p.position);
              }}
              className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                selectedPlace?.id === p.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {p.category}
                </span>
                <span className="text-[10px] font-bold text-amber-500">★ {p.rating}</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{p.name}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                {p.address}
              </p>

              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-blue-500 font-semibold">
                <span className="flex items-center space-x-1">
                  <Phone className="w-3 h-3" />
                  <span>{p.phone || 'Call Provider'}</span>
                </span>
                <span className="flex items-center space-x-0.5">
                  <Navigation className="w-3 h-3" />
                  <span>Directions</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
