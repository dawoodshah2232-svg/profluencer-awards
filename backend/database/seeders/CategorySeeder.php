<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

/**
 * The 10 award categories. Names, slugs and sort order match
 * database/seeds.sql so the SQL package and the Laravel seeders agree.
 */
class CategorySeeder extends Seeder
{
    /**
     * @return array<int, array{name: string, slug: string, description: string, sort_order: int}>
     */
    public static function categories(): array
    {
        return [
            ['name' => 'Fashion and Beauty', 'slug' => 'fashion-and-beauty',
                'description' => 'Style, beauty and fashion creators shaping trends across the region.', 'sort_order' => 1],
            ['name' => 'Lifestyle and Entertainment', 'slug' => 'lifestyle-and-entertainment',
                'description' => 'Lifestyle and entertainment voices with the most engaged audiences.', 'sort_order' => 2],
            ['name' => 'Travel and Hospitality', 'slug' => 'travel-and-hospitality',
                'description' => 'Travel storytellers and hospitality experiences worth following.', 'sort_order' => 3],
            ['name' => 'Food and Dining', 'slug' => 'food-and-dining',
                'description' => 'Food creators, chefs and dining experiences people love.', 'sort_order' => 4],
            ['name' => 'Health Fitness and Wellness', 'slug' => 'health-fitness-and-wellness',
                'description' => 'Coaches and creators inspiring healthier, stronger living.', 'sort_order' => 5],
            ['name' => 'Business and Entrepreneurship', 'slug' => 'business-and-entrepreneurship',
                'description' => 'Founders and business minds building what is next.', 'sort_order' => 6],
            ['name' => 'Finance Trading and Crypto', 'slug' => 'finance-trading-and-crypto',
                'description' => 'Finance educators, traders and crypto voices the community trusts.', 'sort_order' => 7],
            ['name' => 'Technology and Innovation', 'slug' => 'technology-and-innovation',
                'description' => 'Tech reviewers and innovators making the future understandable.', 'sort_order' => 8],
            ['name' => 'Real Estate and Home', 'slug' => 'real-estate-and-home',
                'description' => 'Property experts and home creators guiding smarter living.', 'sort_order' => 9],
            ['name' => 'Education Parenting and Family', 'slug' => 'education-parenting-and-family',
                'description' => 'Educators and family creators making learning part of everyday life.', 'sort_order' => 10],
        ];
    }

    public function run(): void
    {
        foreach (self::categories() as $category) {
            Category::query()->updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
