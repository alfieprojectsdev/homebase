package dev.alfieprojects.homebase.data.db

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import dev.alfieprojects.homebase.data.model.Chore
import dev.alfieprojects.homebase.data.model.IntListConverter
import kotlinx.coroutines.flow.Flow

@Dao
interface ChoreDao {
    @Query("SELECT * FROM chores ORDER BY progress < 100 DESC, updatedAt DESC")
    fun observeAll(): Flow<List<Chore>>

    @Query("SELECT * FROM chores")
    suspend fun getAll(): List<Chore>

    @Query("SELECT * FROM chores WHERE id = :id")
    suspend fun getById(id: Int): Chore?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(chores: List<Chore>)

    @Query("DELETE FROM chores")
    suspend fun clear()

    @Query("DELETE FROM chores WHERE id NOT IN (:keepIds)")
    suspend fun deleteAbsent(keepIds: List<Int>)
}

@Database(entities = [Chore::class], version = 1, exportSchema = false)
@TypeConverters(IntListConverter::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun choreDao(): ChoreDao

    companion object {
        @Volatile private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "homebase.db",
                ).build().also { instance = it }
            }
    }
}
