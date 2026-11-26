public abstract class Vehicle implements Moveable {

    private final String brand;
    private final String model;

    public Vehicle(String brand, String model) {
        this.brand = brand;
        this.model = model;
    }

    public String getBrand() { // @getBrand
        return brand; // @getBrand.return
    }

    public String getModel() { // @getModel
        return model; // @getModel.return
    }

    @Override
    public String toString() { // @toString
        return brand + " " + model; // @toString.return
    }
}
