import ErrorHandler from "../middleware/error.js";

export function calculateHaversine([lon1, lat1], [lon2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getCarType(passengerCount, luggageCount) {
  // Define the rules for car types
  const rules = {
    "3-seater": { 1: 3, 2: 3, 3: 2 }, // Max luggage for each passenger count
    "5-seater": { 1: 5, 2: 5, 3: 4, 4: 3, 5: 2 },
  };

  // Check for 3-seater conditions
  if (
    rules["3-seater"][passengerCount] !== undefined &&
    luggageCount <= rules["3-seater"][passengerCount]
  ) {
    return "3-seater";
  }

  // Check for 5-seater conditions
  if (
    rules["5-seater"][passengerCount] !== undefined &&
    luggageCount <= rules["5-seater"][passengerCount]
  ) {
    return "5-seater";
  }

  // If no valid car type is found, return null
  return null;
}

/**
 * Calculate the fare for an hourly ride.
 * @param {Number} hours - Total duration of the ride in hours.
 * @param {String} carType - Type of car ("3-seater" or "5-seater").
 * @param {Object} addOns - Additional options like airport toll, placard, pets, etc.
 * @returns {Number} - Total fare for the ride in paise.
 */
export function CalculateFareHourly(hours, carType, addOns) {
  // Validate required inputs
  if (!carType || !hours) {
    throw new ErrorHandler(
      "Invalid inputs. carType and hours are required.",
      400
    );
  }

  // Validate carType
  if (!["3-seater", "5-seater"].includes(carType)) {
    throw new ErrorHandler(
      "Invalid carType. Allowed values are '3-seater' or '5-seater'.",
      400
    );
  }

  // Validate hours
  if (hours < 1 || hours > 12) {
    throw new ErrorHandler(
      "Invalid hours. Duration must be between 1 and 12 hours.",
      400
    );
  }

  // Base fare per hour
  const baseFarePerHour = 750;

  // Calculate the total fare
  let totalFare = hours * baseFarePerHour;

  // Add charges for addOns
  if (addOns && Object.keys(addOns).length > 0) {
    if (addOns.airportToll) {
      totalFare += 200; // ₹200 for airport toll
    }
    if (addOns.placard && addOns.placard.required) {
      totalFare += 500; // ₹500 for placard
    }
    if (addOns.pets) {
      if (addOns.pets.cats) {
        totalFare += 500; // ₹500 for cats
      }
      if (addOns.pets.dogs) {
        totalFare += 750; // ₹750 for dogs
      }
    }
    if (addOns.childSeat) {
      totalFare += 500; // ₹500 for child seat
    }
  }

  return totalFare * 100; // Convert to paise
}

/**
 * Calculate the fare for an outstation trip.
 * @param {Number} totalDistance - Total distance of the trip in kilometers.
 * @param {String} carType - Type of car ("3-seater" or "5-seater").
 * @param {Boolean} isRoundTrip - Whether the trip is a round trip.
 * @param {String} startTime - Start time of the trip (ISO string).
 * @param {String} returnTime - Return time of the trip (ISO string, required for round trips).
 * @param {Object} addOns - Additional options like airport toll, placard, pets, etc.
 * @returns {Number} - Total fare for the trip in paise.
 */
export function CalculateFareOutstation(
  totalDistance,
  carType,
  isRoundTrip,
  startTime,
  returnTime,
  addOns
) {
  // Validate required inputs
  if (!carType || !totalDistance || !startTime) {
    throw new ErrorHandler(
      "Invalid inputs. carType, totalDistance, and startTime are required.",
      400
    );
  }

  // console.log("Car type determined:", carType);

  // Validate carType
  if (!["3-seater", "5-seater"].includes(carType)) {
    throw new ErrorHandler(
      "Invalid carType. Allowed values are '3-seater' or '5-seater'.",
      400
    );
  }

  // Validate totalDistance
  if (totalDistance <= 0) {
    throw new ErrorHandler(
      "Invalid totalDistance. It must be greater than 0.",
      400
    );
  }

  // Validate round trip inputs
  if (isRoundTrip && !returnTime) {
    throw new ErrorHandler("returnTime is required for round trips.", 400);
  }

  // Validate time formats
  if (isNaN(new Date(startTime).getTime())) {
    throw new ErrorHandler("Invalid startTime format.", 400);
  }

  if (isRoundTrip && isNaN(new Date(returnTime).getTime())) {
    throw new ErrorHandler("Invalid returnTime format.", 400);
  }

  // Distance-based fare calculation
  let oneWayFarePerKm = 0;
  let roundTripAdditionalPerKm = 0;

  if (totalDistance <= 30) {
    oneWayFarePerKm = 79;
    roundTripAdditionalPerKm = 39.5;
  } else if (totalDistance <= 75) {
    oneWayFarePerKm = 72;
    roundTripAdditionalPerKm = 36;
  } else if (totalDistance <= 100) {
    oneWayFarePerKm = 67;
    roundTripAdditionalPerKm = 33.5;
  } else if (totalDistance <= 150) {
    oneWayFarePerKm = 64;
    roundTripAdditionalPerKm = 32;
  } else if (totalDistance <= 200) {
    oneWayFarePerKm = 60;
    roundTripAdditionalPerKm = 30;
  } else if (totalDistance <= 250) {
    oneWayFarePerKm = 57;
    roundTripAdditionalPerKm = 28.5;
  } else if (totalDistance <= 325) {
    oneWayFarePerKm = 52;
    roundTripAdditionalPerKm = 26;
  } else if (totalDistance <= 400) {
    oneWayFarePerKm = 45;
    roundTripAdditionalPerKm = 22.5;
  } else if (totalDistance <= 500) {
    oneWayFarePerKm = 41;
    roundTripAdditionalPerKm = 20.5;
  } else {
    throw new ErrorHandler(
      "Distance exceeds maximum allowed limit of 500km.",
      400
    );
  }

  // Calculate base fare (one-way)
  let totalFare = totalDistance * oneWayFarePerKm;

  // Add round trip additional charges if applicable
  if (isRoundTrip) {
    totalFare = totalDistance * (oneWayFarePerKm + roundTripAdditionalPerKm);
  }

  // Compulsory daily driver fee
  let driverFee = 200;

  // Calculate time-based charges for round trips
  if (isRoundTrip) {
    const startDate = new Date(startTime);
    const returnDate = new Date(returnTime);

    // Calculate time difference in hours
    const timeDiffHours = (returnDate - startDate) / (1000 * 60 * 60);

    if (timeDiffHours < 0) {
      throw new ErrorHandler("Return time cannot be before start time.", 400);
    }

    // Calculate additional driver fees based on time
    if (timeDiffHours <= 12) {
      // Same day return: ₹200 (already included in base driver fee)
      // No additional charges
    } else {
      // After 12 hours: Calculate additional ₹750 for every 12-hour period
      const additionalPeriods = Math.floor(timeDiffHours / 12);
      driverFee += additionalPeriods * 750;
    }
  }

  // Add driver fee to total
  totalFare += driverFee;

  // Add charges for addOns
  if (addOns && Object.keys(addOns).length > 0) {
    if (addOns.airportToll) {
      totalFare += 200; // ₹200 for airport toll
    }
    if (addOns.placard && addOns.placard.required) {
      totalFare += 500; // ₹500 for placard
    }
    if (addOns.pets) {
      if (addOns.pets.cats) {
        totalFare += 500; // ₹500 for cats
      }
      if (addOns.pets.dogs) {
        totalFare += 750; // ₹750 for dogs
      }
    }
    if (addOns.childSeat) {
      totalFare += 500; // ₹500 for child seat
    }
  }

  return totalFare * 100; // Convert to paise
}
