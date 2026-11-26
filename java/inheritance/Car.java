public class Car extends MotorizedVehicle {

    public Car(String brand, String model, Engine engine) {
        super(brand, model, engine);
    }

    @Override
    public void start() { // @start
        System.out.println("Turn the key of the " + this); // @start.print
        startEngine(); // @start.engine
    }
}
