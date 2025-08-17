const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^\+91[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

const isValidName = (name) => {
  const nameRegex = /^[a-zA-Z\s]+$/;
  return nameRegex.test(name);
};

const isValidCompanyEmail = (email, companyDomain) => {
  if (!isValidEmail(email)) return false;
  return email.toLowerCase().endsWith(companyDomain.toLowerCase());
};

// Helper function to validate location objects
const validateLocation = (location, fieldName) => {
  if (!location || typeof location !== "object") {
    return `${fieldName} location is required`;
  }

  if (!location.coordinates || !Array.isArray(location.coordinates)) {
    return `${fieldName} coordinates must be an array`;
  }

  if (location.coordinates.length !== 2) {
    return `${fieldName} coordinates must have exactly 2 values [longitude, latitude]`;
  }

  const [lng, lat] = location.coordinates;
  if (typeof lng !== "number" || typeof lat !== "number") {
    return `${fieldName} coordinates must be numbers`;
  }

  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return `${fieldName} coordinates are out of valid range`;
  }

  return null;
};

const validateAddOns = (addOns) => {
  // Check if addOns is provided and is an object
  if (addOns && typeof addOns !== "object") {
    return "AddOns must be an object";
  }

  if (!addOns) {
    return null; // addOns is optional
  }

  // Define allowed addOn properties
  const allowedAddOns = [
    "airportToll",
    "placard",
    "pets",
    "bookForOther",
    "childSeat",
  ];

  // Check for invalid properties
  const invalidProperties = Object.keys(addOns).filter(
    (key) => !allowedAddOns.includes(key)
  );

  if (invalidProperties.length > 0) {
    return `Invalid addOn properties: ${invalidProperties.join(
      ", "
    )}. Allowed properties: ${allowedAddOns.join(", ")}`;
  }

  // Validate airportToll
  if (
    addOns.airportToll !== undefined &&
    typeof addOns.airportToll !== "boolean"
  ) {
    return "airportToll must be a boolean";
  }

  // Validate childSeat
  if (addOns.childSeat !== undefined && typeof addOns.childSeat !== "boolean") {
    return "childSeat must be a boolean";
  }

  // Validate placard structure
  if (addOns.placard !== undefined) {
    if (typeof addOns.placard !== "object" || addOns.placard === null) {
      return "placard must be an object";
    }

    const allowedPlacardProps = ["required", "text"];
    const invalidPlacardProps = Object.keys(addOns.placard).filter(
      (key) => !allowedPlacardProps.includes(key)
    );

    if (invalidPlacardProps.length > 0) {
      return `Invalid placard properties: ${invalidPlacardProps.join(
        ", "
      )}. Allowed: ${allowedPlacardProps.join(", ")}`;
    }

    if (
      addOns.placard.required !== undefined &&
      typeof addOns.placard.required !== "boolean"
    ) {
      return "placard.required must be a boolean";
    }

    if (
      addOns.placard.text !== undefined &&
      typeof addOns.placard.text !== "string"
    ) {
      return "placard.text must be a string";
    }
  }

  // Validate pets structure
  if (addOns.pets !== undefined) {
    if (typeof addOns.pets !== "object" || addOns.pets === null) {
      return "pets must be an object";
    }

    const allowedPetProps = ["dogs", "cats"];
    const invalidPetProps = Object.keys(addOns.pets).filter(
      (key) => !allowedPetProps.includes(key)
    );

    if (invalidPetProps.length > 0) {
      return `Invalid pets properties: ${invalidPetProps.join(
        ", "
      )}. Allowed: ${allowedPetProps.join(", ")}`;
    }

    if (
      addOns.pets.dogs !== undefined &&
      typeof addOns.pets.dogs !== "boolean"
    ) {
      return "pets.dogs must be a boolean";
    }

    if (
      addOns.pets.cats !== undefined &&
      typeof addOns.pets.cats !== "boolean"
    ) {
      return "pets.cats must be a boolean";
    }
  }

  // Validate bookForOther structure
  if (addOns.bookForOther !== undefined) {
    if (
      typeof addOns.bookForOther !== "object" ||
      addOns.bookForOther === null
    ) {
      return "bookForOther must be an object";
    }

    const allowedBookForOtherProps = ["isBooking", "otherGuestInfo"];
    const invalidBookForOtherProps = Object.keys(addOns.bookForOther).filter(
      (key) => !allowedBookForOtherProps.includes(key)
    );

    if (invalidBookForOtherProps.length > 0) {
      return `Invalid bookForOther properties: ${invalidBookForOtherProps.join(
        ", "
      )}. Allowed: ${allowedBookForOtherProps.join(", ")}`;
    }

    if (
      addOns.bookForOther.isBooking !== undefined &&
      typeof addOns.bookForOther.isBooking !== "boolean"
    ) {
      return "bookForOther.isBooking must be a boolean";
    }

    if (
      addOns.bookForOther.otherGuestInfo !== undefined &&
      typeof addOns.bookForOther.otherGuestInfo !== "string"
    ) {
      return "bookForOther.otherGuestInfo must be a string";
    }
  }

  return null; // All validations passed
};

export {
  isValidEmail,
  isValidPhoneNumber,
  isValidName,
  isValidCompanyEmail,
  validateLocation,
  validateAddOns,
};
