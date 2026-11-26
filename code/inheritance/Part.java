public class Part {

    private final String identifier;
    private final String manufacturer;
    private final String description;

    public Part(String identifier, String manufacturer, String description) {
        this.identifier = identifier;
        this.manufacturer = manufacturer;
        this.description = description;
    }

    public String getIdentifier() { // @getIdentifier
        return identifier; // @getIdentifier.return
    }

    public String getDescription() { // @getDescription
        return description; // @getDescription.return
    }

    public String getManufacturer() { // @getManufacturer
        return manufacturer; // @getManufacturer.return
    }

    @Override
    public String toString() { // @toString
        return identifier + ": " + description + " by " + manufacturer; // @toString.return
    }
}
